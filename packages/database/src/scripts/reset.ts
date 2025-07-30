/* eslint-disable no-console */
import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Schema } from "effect";
import { PgLive } from "../database.js";

void Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const schemaList = ["public"];

  const getTypes = SqlSchema.findAll({
    Request: Schema.Void,
    Result: Schema.Struct({ typname: Schema.String, schemaname: Schema.String }),
    execute: () => sql`
      SELECT
        t.typname,
        n.nspname AS schemaname
      FROM
        pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE
        t.typtype = 'e'
        AND n.nspname IN ${sql.in(schemaList)}
    `,
  });

  const getTables = SqlSchema.findAll({
    Request: Schema.Void,
    Result: Schema.Struct({ tableName: Schema.String, schemaName: Schema.String }),
    execute: () => sql`
      SELECT
        table_name,
        table_schema AS schema_name
      FROM
        information_schema.tables
      WHERE
        table_schema IN ${sql.in(schemaList)}
        AND table_type = 'BASE TABLE'
    `,
  });

  const types = yield* getTypes();
  const tables = yield* getTables();

  yield* sql.withTransaction(
    Effect.gen(function* () {
      console.log(`🗑️ Starting database reset for schemas: ${schemaList.join(", ")}`);

      if (types.length > 0) {
        console.log(`Dropping ${types.length} types`);
        for (const type of types) {
          yield* sql`DROP TYPE IF EXISTS ${sql(type.schemaname)}.${sql(type.typname)} CASCADE`;
        }
        console.log(`✅ Dropped ${types.length} types`);
      } else {
        console.log(`No types to drop`);
      }

      if (tables.length > 0) {
        console.log(`Dropping ${tables.length} tables`);
        for (const table of tables) {
          yield* sql`DROP TABLE IF EXISTS ${sql(table.schemaName)}.${sql(table.tableName)} CASCADE`;
        }
        console.log(`✅ Dropped ${tables.length} tables`);
      } else {
        console.log(`No tables to drop`);
      }
    }),
  );
}).pipe(Effect.provide(PgLive), Effect.runPromise);
