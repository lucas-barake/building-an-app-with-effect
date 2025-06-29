import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PgMigrator } from "@effect/sql-pg";
import { Effect } from "effect";
import * as path from "path";
import { fileURLToPath } from "url";
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
