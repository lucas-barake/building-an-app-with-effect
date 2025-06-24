import { NodeRuntime } from "@effect/platform-node";
import { Console } from "effect";

const program = Console.log("server.ts");

NodeRuntime.runMain(program);
