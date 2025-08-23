import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { DomainApi } from "@org/domain/domain-api";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { StylesRepo } from "./services/styles-repo.js";

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
