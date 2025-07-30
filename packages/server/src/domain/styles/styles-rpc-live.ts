import { HttpApiBuilder } from "@effect/platform";
import { DomainApi } from "@org/domain/domain-api";
import { Effect, Layer } from "effect";
import { StylesRepo } from "./internal/styles-repo.js";

export const StylesRpcLive = HttpApiBuilder.group(DomainApi, "styles", (handlers) =>
  Effect.gen(function* () {
    const repo = yield* StylesRepo;

    return handlers
      .handle("list", () => repo.findAll())
      .handle("upsert", ({ payload }) =>
        Effect.gen(function* () {
          if (payload.id !== undefined) {
            return yield* repo.update({
              id: payload.id,
              name: payload.name,
              rule: payload.rule,
            });
          }
          return yield* repo.create({
            name: payload.name,
            rule: payload.rule,
          });
        }),
      )
      .handle("delete", ({ payload }) => repo.del(payload.id));
  }),
).pipe(Layer.provide(StylesRepo.Default));
