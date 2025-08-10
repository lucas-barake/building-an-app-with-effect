import { useAtomMount } from "@effect-atom/atom-react";
import type React from "react";
import { makeAtomRuntime } from "./atom/make-atom-runtime";
import { WorkerClient } from "./services/worker/worker-client";

const kaRuntime = makeAtomRuntime(WorkerClient.Default);

export const KaServices: React.FC = () => {
  useAtomMount(kaRuntime);
  return null;
};
