import {
  EventStreamEvent,
  EventStreamRpc,
} from "@org/domain/example-rpc";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import { constant } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Mailbox from "effect/Mailbox";
import * as Stream from "effect/Stream";
import { randomUUID } from "node:crypto";
import { EventStreamHub } from "./event-stream-hub.js";

export const EventStreamRpcLive = EventStreamRpc.toLayer(
  Effect.gen(function* () {
    const eventHub = yield* EventStreamHub;

    const ka: [EventStreamEvent] = [{ _tag: "Ka" }];
    const kaStream = Stream.tick("3 seconds").pipe(
      Stream.map(constant(ka)),
    );

    return EventStreamRpc.of({
      eventStream_connect: Effect.fnUntraced(function* () {
        const connectionId = randomUUID();
        const mailbox =
          yield* Mailbox.make<EventStreamEvent>();

        yield* Effect.acquireRelease(
          eventHub.registerConnection(
            connectionId,
            mailbox,
          ),
          () => eventHub.unregisterConnection(connectionId),
        );

        const eventStream = Mailbox.toStream(mailbox).pipe(
          Stream.groupedWithin(25, "50 millis"),
          Stream.map((chunk) => Chunk.toArray(chunk)),
          Stream.interruptAfter("2 hours"),
        );

        return Stream.merge(eventStream, kaStream, {
          haltStrategy: "either",
        });
      }, Stream.unwrapScoped),
    });
  }),
).pipe(Layer.provide(EventStreamHub.Default));
