import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

export class WorkerRpc extends RpcGroup.make(
  Rpc.make("calculatePrimes", {
    success: Schema.Number,
    error: Schema.Never,
    payload: {
      upperBound: Schema.Number,
    },
  }),
) {}
