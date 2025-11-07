import {
  ExampleItem,
  ExampleRpc,
} from "@org/domain/example-rpc";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { randomUUID } from "node:crypto";
import { EventStreamHub } from "./event-stream-hub.js";

export const ExampleRpcLive = ExampleRpc.toLayer(
  Effect.gen(function* () {
    const eventStreamHub = yield* EventStreamHub;
    const items = Arr.empty<ExampleItem>();

    return ExampleRpc.of({
      get: () => Effect.succeed(items),
      add: Effect.fn(function* (payload) {
        const item = new ExampleItem({
          id: randomUUID(),
          value: payload,
        });

        items.unshift(item);

        yield* eventStreamHub.notifyAll(item);

        return item;
      }),
    });
  }),
).pipe(Layer.provide(EventStreamHub.Default));
