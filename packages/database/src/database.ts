import * as PgClient from "@effect/sql-pg/PgClient";
import * as Config from "effect/Config";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import { identity } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import * as String from "effect/String";

export const pgConfig = {
  transformQueryNames: String.camelToSnake,
  transformResultNames: String.snakeToCamel,
  // - 114: JSON (return as string instead of parsed object)
  // - 1082: DATE
  // - 1114: TIMESTAMP WITHOUT TIME ZONE
  // - 1184: TIMESTAMP WITH TIME ZONE
  // - 3802: JSONB (return as string instead of parsed object)
  types: {
    114: {
      to: 25,
      from: [114],
      parse: identity,
      serialize: identity,
    },
    1082: {
      to: 25,
      from: [1082],
      parse: identity,
      serialize: identity,
    },
    1114: {
      to: 25,
      from: [1114],
      parse: identity,
      serialize: identity,
    },
    1184: {
      to: 25,
      from: [1184],
      parse: identity,
      serialize: identity,
    },
    3802: {
      to: 25,
      from: [3802],
      parse: identity,
      serialize: identity,
    },
  },
} as const;

export const PgLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    return PgClient.layer({
      url: yield* Config.redacted("DATABASE_URL"),
      ...pgConfig,
    });
  }),
).pipe((self) =>
  Layer.retry(
    self,
    Schedule.identity<Layer.Layer.Error<typeof self>>().pipe(
      Schedule.check((input) => input._tag === "SqlError"),
      Schedule.intersect(Schedule.exponential("1 second")),
      Schedule.intersect(Schedule.recurs(2)),
      Schedule.onDecision(([[_error, duration], attempt], decision) =>
        decision._tag === "Continue"
          ? Effect.logInfo(
              `Retrying database connection in ${Duration.format(duration)} (attempt #${++attempt})`,
            )
          : Effect.void,
      ),
    ),
  ),
);
