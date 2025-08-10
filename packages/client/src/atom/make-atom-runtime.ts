import { Atom } from "@effect-atom/atom-react";
import { Layer, Logger, LogLevel } from "effect";
import { envVars } from "../lib/env-vars";

export const makeAtomRuntime = Atom.context({ memoMap: Atom.defaultMemoMap });
makeAtomRuntime.addGlobalLayer(
  Layer.provideMerge(
    Logger.pretty,
    Logger.minimumLogLevel(envVars.EFFECTIVE_ENV === "dev" ? LogLevel.Debug : LogLevel.Info),
  ),
);
