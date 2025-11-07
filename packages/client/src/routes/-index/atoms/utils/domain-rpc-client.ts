import { envVars } from "@/lib/env-vars";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as RpcClient from "@effect/rpc/RpcClient";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import { DomainRpc } from "@org/domain/example-rpc";
import * as Effect from "effect/Effect";
import { identity } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Random from "effect/Random";

const localDelay = <A, E, R>(
  self: Effect.Effect<A, E, R>,
) =>
  Random.nextRange(400, 600).pipe(
    Effect.flatMap((ms) => Effect.sleep(ms)),
    Effect.zipRight(self),
  );

const ProtocolLive = RpcClient.layerProtocolHttp({
  url: `${envVars.API_URL.toString()}rpc`,
  transformClient: (client) =>
    client.pipe(
      HttpClient.retryTransient({ times: 3 }),
      HttpClient.tapError(Effect.logError),
      envVars.ENV === "local"
        ? HttpClient.transformResponse(localDelay)
        : identity,
    ),
}).pipe(
  Layer.provide([
    FetchHttpClient.layer,
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
