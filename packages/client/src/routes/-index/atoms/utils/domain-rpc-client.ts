import { envVars } from "@/lib/env-vars";
import * as BrowserSocket from "@effect/platform-browser/BrowserSocket";
import * as RpcClient from "@effect/rpc/RpcClient";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import { DomainRpc } from "@org/domain/example-rpc";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

const ProtocolLive = RpcClient.layerProtocolSocket({
  retryTransientErrors: true,
}).pipe(
  Layer.provide([
    BrowserSocket.layerWebSocket(
      `${envVars.API_URL.toString().replace(/^http/, "ws")}rpc`,
    ),
    RpcSerialization.layerNdjson,
  ]),
);

export class DomainRpcClient extends Effect.Service<DomainRpcClient>()(
  "@org/client/features/index/atoms/domain-rpc-client/DomainRpcClient",
  {
    dependencies: [ProtocolLive],
    scoped: RpcClient.make(DomainRpc),
  },
) {}
