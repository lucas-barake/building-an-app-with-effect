import { makeAtomRuntime } from "@/atom/make-atom-runtime";
import { Atom, Registry } from "@effect-atom/atom-react";
import { EventStreamEvent } from "@org/domain/example-rpc";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as PubSub from "effect/PubSub";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import { DomainRpcClient } from "./utils/domain-rpc-client";
import { prefixLogs } from "./utils/prefix-logs";

export class EventStream extends Effect.Service<EventStream>()(
  "@org/client/services/atoms/event-stream-atoms/EventStream",
  {
    effect: Effect.gen(function* () {
      const pubSub =
        yield* PubSub.unbounded<EventStreamEvent>();
      return {
        changes: Stream.fromPubSub(pubSub),
        offer: (event: EventStreamEvent) =>
          pubSub.publish(event),
      };
    }),
  },
) {}

const runtime = makeAtomRuntime(
  Layer.mergeAll(
    EventStream.Default,
    DomainRpcClient.Default,
  ),
);

export const eventStreamAtom = runtime
  .atom(
    Effect.gen(function* () {
      const rpc = yield* DomainRpcClient;
      const eventStream = yield* EventStream;

      const source = yield* Effect.acquireRelease(
        rpc
          .eventStream_connect()
          .pipe(
            Stream.flattenIterables,
            Stream.share({ capacity: "unbounded" }),
          ),
        () =>
          Effect.logInfo("EventStream connection closed"),
      );

      const ka = source.pipe(
        Stream.filter((event) => event._tag === "Ka"),
        Stream.timeout("5 seconds"),
      );

      const sync = source.pipe(
        Stream.filter((event) => event._tag !== "Ka"),
        Stream.tap((event) => eventStream.offer(event)),
      );

      return Stream.merge(ka, sync, {
        haltStrategy: "either",
      });
    }).pipe(
      prefixLogs("EventStream"),
      Effect.retry({
        times: 3,
        schedule: Schedule.exponential("500 millis", 2),
      }),
      Stream.unwrapScoped,
    ),
  )
  .pipe(Atom.keepAlive);

export const makeEventStreamAtom = <
  A extends EventStreamEvent,
  R,
>(options: {
  readonly runtime: Atom.AtomRuntime<R | EventStream, any>;
  readonly identifier: string;
  readonly predicate: (
    event: EventStreamEvent,
  ) => event is A;
  readonly handler: (
    event: A,
  ) => Effect.Effect<
    void,
    any,
    NoInfer<R | Registry.AtomRegistry>
  >;
}) => {
  return options.runtime
    .atom(
      Effect.gen(function* () {
        const eventStream = yield* EventStream;

        yield* Effect.acquireRelease(
          Effect.logInfo("consumer acquired"),
          () => Effect.logInfo("consumer released"),
        );

        yield* eventStream.changes.pipe(
          Stream.filter(options.predicate),
          Stream.tap((event) =>
            Effect.log("received", event),
          ),
          Stream.tap((event) => options.handler(event)),
          Stream.catchAllCause((cause) =>
            Effect.logError(cause),
          ),
          Stream.runDrain,
        );
      }).pipe(
        prefixLogs(`${options.identifier} EventStream`),
      ),
    )
    .pipe(Atom.setIdleTTL(0));
};
