import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

export class ExampleItem extends Schema.TaggedClass<ExampleItem>(
  "ExampleItem",
)("ExampleItem", {
  id: Schema.UUID,
  value: Schema.String,
}) {}

export const ExampleRpc = RpcGroup.make(
  Rpc.make("add", {
    payload: ExampleItem.fields.value,
    success: ExampleItem,
  }),
  Rpc.make("get", {
    success: Schema.Array(ExampleItem),
  }),
);

// ================================
// Event Stream RPC
// ================================

export const EventStreamEvent = Schema.Union(
  ExampleItem,
  Schema.TaggedStruct("Ka", {}),
);
export type EventStreamEvent = typeof EventStreamEvent.Type;

export class EventStreamRpc extends RpcGroup.make(
  Rpc.make("connect", {
    stream: true,
    success: Schema.Array(EventStreamEvent),
  }),
).prefix("eventStream_") {}

export class DomainRpc extends ExampleRpc.merge(
  EventStreamRpc,
) {}
