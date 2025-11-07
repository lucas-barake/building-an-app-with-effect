import { makeAtomRuntime } from "@/atom/make-atom-runtime";
import { withToast } from "@/atom/with-toast";
import {
  Atom,
  Registry,
  Result,
} from "@effect-atom/atom-react";
import { ExampleItem } from "@org/domain/example-rpc";
import * as Arr from "effect/Array";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import {
  EventStream,
  makeEventStreamAtom,
} from "./event-stream-atoms";
import { DomainRpcClient } from "./utils/domain-rpc-client";

const runtime = makeAtomRuntime(
  Layer.mergeAll(
    DomainRpcClient.Default,
    EventStream.Default,
  ),
);

export const getAtom = (() => {
  const remoteAtom = runtime.atom(
    Effect.gen(function* () {
      const rpc = yield* DomainRpcClient;
      return yield* rpc.get();
    }),
  );

  return Atom.writable(
    (get) => get(remoteAtom),
    (
      ctx,
      update: Data.TaggedEnum<{
        Add: { item: ExampleItem };
      }>,
    ) => {
      const selfResult = ctx.get(getAtom);
      if (selfResult._tag !== "Success") return;
      if (
        selfResult.value.some(
          (item) => item.id === update.item.id,
        )
      ) {
        return;
      }

      const nextValue = Arr.prepend(
        selfResult.value,
        update.item,
      );
      ctx.setSelf(Result.success(nextValue));
    },
    (refresh) => {
      refresh(remoteAtom);
    },
  );
})();

export const addAtom = runtime.fn(
  Effect.fn(
    function* (value: string) {
      const registry = yield* Registry.AtomRegistry;
      const rpc = yield* DomainRpcClient;

      const newItem = yield* rpc.add(value);
      registry.set(getAtom, { _tag: "Add", item: newItem });
    },
    withToast({
      whenSuccess: "Item added",
      whenFailure: "Failed to add item",
      whenLoading: "Adding item...",
    }),
  ),
);

export const syncAtom = makeEventStreamAtom({
  runtime,
  identifier: "ExampleSync",
  predicate: Schema.is(ExampleItem),
  handler: Effect.fn(function* (event: ExampleItem) {
    const registry = yield* Registry.AtomRegistry;
    registry.set(getAtom, { _tag: "Add", item: event });
  }),
});
