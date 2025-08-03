import { Rx } from "@effect-rx/rx-react";
import { Effect, Layer, Logger, LogLevel, ManagedRuntime } from "effect";
import { envVars } from "../lib/env-vars";
import { ApiClient } from "../services/common/api-client";
import { NetworkMonitor } from "../services/common/network-monitor";
import { WorkerClient } from "../services/worker/worker-client";

const memoMap = Effect.runSync(Layer.makeMemoMap);

const MainLayer = Layer.mergeAll(
  ApiClient.Default,
  NetworkMonitor.Default,
  WorkerClient.Default,
).pipe(
  Layer.provideMerge(Logger.pretty),
  Layer.provideMerge(
    Logger.minimumLogLevel(envVars.EFFECTIVE_ENV === "dev" ? LogLevel.Debug : LogLevel.Info),
  ),
  Layer.tapErrorCause(Effect.logError),
);

export const runtime = ManagedRuntime.make(MainLayer, memoMap);

export const makeRxRuntime = Rx.context({ memoMap });
export const rxRuntime = makeRxRuntime(MainLayer);
