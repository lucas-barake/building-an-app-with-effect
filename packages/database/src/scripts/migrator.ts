import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as PgMigrator from "@effect/sql-pg/PgMigrator";
import * as Effect from "effect/Effect";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PgLive } from "../database.js";

NodeRuntime.runMain(
  Effect.gen(function* () {
    const migrations = yield* PgMigrator.run({
      loader: PgMigrator.fromFileSystem(
        path.join(fileURLToPath(new URL(".", import.meta.url)), "../migrations"),
      ),
      schemaDirectory: path.join(fileURLToPath(new URL(".", import.meta.url)), "../migrations/sql"),
    });

    if (migrations.length === 0) {
      yield* Effect.log("No new migrations to run.");
    } else {
      yield* Effect.log("Migrations applied:");
      for (const [id, name] of migrations) {
        yield* Effect.log(`- ${id.toString().padStart(4, "0")}_${name}`);
      }
    }
  }).pipe(Effect.provide([NodeContext.layer, PgLive])),
);
