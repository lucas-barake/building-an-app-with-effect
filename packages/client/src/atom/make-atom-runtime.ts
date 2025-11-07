import { Atom } from "@effect-atom/atom-react";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as LogLevel from "effect/LogLevel";
import { envVars } from "../lib/env-vars";

export const makeAtomRuntime = Atom.context({
  memoMap: Atom.defaultMemoMap,
});
makeAtomRuntime.addGlobalLayer(
  Layer.provideMerge(
    Logger.pretty,
    Logger.minimumLogLevel(
      envVars.EFFECTIVE_ENV === "dev"
        ? LogLevel.Debug
        : LogLevel.Info,
    ),
  ),
);
