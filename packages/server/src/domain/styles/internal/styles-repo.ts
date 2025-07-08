import { SqlClient, SqlSchema } from "@effect/sql";
import { PgLive } from "@org/database/database";
import { Style, StyleId, StyleNotFoundError } from "@org/domain/api/styles-rpc";
import { Effect, flow, Schema } from "effect";

const CreateStyleInput = Style.pipe(Schema.pick("name", "rule"));

const UpdateStyleInput = Style.pipe(Schema.pick("id", "name", "rule"));
type UpdateStyleInput = typeof UpdateStyleInput.Type;

export class StylesRepo extends Effect.Service<StylesRepo>()("StylesRepo", {
  dependencies: [PgLive],
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const findAll = SqlSchema.findAll({
      Result: Style,
      Request: Schema.Void,
      execute: () => sql`
        SELECT
          *
        FROM
          styles
      `,
    });

    const create = SqlSchema.single({
      Result: Style,
      Request: CreateStyleInput,
      execute: (request) => sql`
        INSERT INTO
          styles ${sql.insert(request)}
        RETURNING
          *
      `,
    });

    const update = SqlSchema.single({
      Result: Style,
      Request: UpdateStyleInput,
      execute: (request) => sql`
        UPDATE styles
        SET
          ${sql.update(request)}
        WHERE
          id = ${request.id}
        RETURNING
          *
      `,
    });

    const del = SqlSchema.single({
      Request: StyleId,
      Result: Schema.Unknown,
      execute: (id) => sql`
        DELETE FROM styles
        WHERE
          id = ${id}
        RETURNING
          id
      `,
    });

    return {
      findAll: flow(findAll, Effect.orDie),
      del: (id: StyleId) =>
        del(id).pipe(
          Effect.asVoid,
          Effect.catchTags({
            NoSuchElementException: () => new StyleNotFoundError({ id }),
            ParseError: Effect.die,
            SqlError: Effect.die,
          }),
        ),
      update: (request: UpdateStyleInput) =>
        update(request).pipe(
          Effect.catchTags({
            NoSuchElementException: () => new StyleNotFoundError({ id: request.id }),
            ParseError: Effect.die,
            SqlError: Effect.die,
          }),
        ),
      create: flow(create, Effect.orDie),
    } as const;
  }),
}) {}
