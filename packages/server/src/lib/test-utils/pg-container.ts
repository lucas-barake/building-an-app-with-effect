import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { pgConfig } from "@org/database/database";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Effect, Layer, Redacted } from "effect";
import * as path from "path";
import { fileURLToPath } from "url";

export class PgContainer extends Effect.Service<PgContainer>()("PgContainer", {
  scoped: Effect.acquireRelease(
    Effect.promise(() => new PostgreSqlContainer("postgres:alpine").start()),
    (container) => Effect.promise(() => container.stop()),
  ),
}) {
  static readonly Live = Layer.effectDiscard(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const fs = yield* FileSystem.FileSystem;

      const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
      const schemaPath = path.resolve(
        currentFileDir,
        "../../../../database/src/migrations/sql/_schema.sql",
      );

      const schema = yield* fs.readFileString(schemaPath);
      yield* sql.unsafe(schema);
    }),
  ).pipe(
    Layer.provideMerge(
      Layer.unwrapEffect(
        Effect.gen(function* () {
          const container = yield* PgContainer;
          return PgClient.layer({
            url: Redacted.make(container.getConnectionUri()),
            ...pgConfig,
          });
        }),
      ),
    ),
    Layer.provide(PgContainer.Default),
    Layer.provide(NodeContext.layer),
    Layer.orDie,
  );
}
