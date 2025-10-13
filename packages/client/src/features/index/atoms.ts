import { Atom } from "@effect-atom/atom-react";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as EffectRpcClient from "@effect/rpc/RpcClient";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import { RpcDef } from "@org/domain/rpc-def";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

const ProtocolLive = EffectRpcClient.layerProtocolHttp({ url: "http://localhost:3000/rpc" }).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(RpcSerialization.layerNdjson),
);

class RpcClient extends Effect.Service<RpcClient>()("@org/RpcClient", {
  dependencies: [ProtocolLive],
  scoped: Effect.gen(function* () {
    return {
      client: yield* EffectRpcClient.make(RpcDef),
    } as const;
  }),
}) {}

const runtime = Atom.runtime(RpcClient.Default);

export type OutputEvent =
  | { readonly _tag: "SearchingWeb" }
  | { readonly _tag: "EvaluatingCandidates" }
  | { readonly _tag: "Summarizing" }
  | { readonly _tag: "ChunkAccumulated"; readonly accumulatedText: string }
  | { readonly _tag: "Completed"; readonly text: string };

export const searchAtom = runtime.fn(({ query }: { readonly query: string }) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const rpc = yield* RpcClient;
      return rpc.client.search({ query });
    }),
  ).pipe(
    Stream.filter((event) => event._tag !== "Ka"),
    Stream.catchTags({
      RpcClientError: Effect.die,
    }),
    Stream.mapAccum(
      { accumulatedText: "" },
      (state, event): readonly [{ accumulatedText: string }, OutputEvent] => {
        switch (event._tag) {
          case "SearchingWeb":
          case "EvaluatingCandidates":
          case "Summarizing":
            return [state, event] as const;
          case "Chunk": {
            const newText = state.accumulatedText + event.delta;
            return [
              { accumulatedText: newText },
              { _tag: "ChunkAccumulated", accumulatedText: newText },
            ] as const;
          }
          case "Completed":
            return [{ accumulatedText: "" }, event] as const;
        }
      },
    ),
  ),
);
