import { PgContainer } from "@/lib/test-utils/pg-container.js";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { StylesRepo } from "./styles-repo.js";

const layer = StylesRepo.DefaultWithoutDependencies.pipe(Layer.provide(PgContainer.Live));

it.layer(layer, { timeout: "30 seconds" })("StylesRepo", (it) => {
  it.effect(
    "should create a style",
    Effect.fnUntraced(function* () {
      const repo = yield* StylesRepo;
      const newStyle = yield* repo.create({
        name: "test-create",
        rule: "rule-create",
      });

      expect(newStyle).toBeDefined();
      expect(newStyle.name).toBe("test-create");
    }),
  );

  it.effect(
    "should find all styles",
    Effect.fnUntraced(function* () {
      const repo = yield* StylesRepo;
      const createdStyle = yield* repo.create({ name: "test-find", rule: "rule-find" });

      const styles = yield* repo.findAll();

      expect(styles.length).toBeGreaterThan(0);
      expect(styles).toContainEqual(createdStyle);
    }),
  );

  it.effect(
    "should update a style",
    Effect.fnUntraced(function* () {
      const repo = yield* StylesRepo;
      const originalStyle = yield* repo.create({
        name: "test-update-before",
        rule: "rule-update-before",
      });

      const updatedStyle = yield* repo.update({
        id: originalStyle.id,
        name: "test-update-after",
        rule: "rule-update-after",
      });

      expect(updatedStyle.id).toBe(originalStyle.id);
      expect(updatedStyle.name).toBe("test-update-after");
    }),
  );

  it.effect(
    "should delete a style",
    Effect.fnUntraced(function* () {
      const repo = yield* StylesRepo;
      const styleToDelete = yield* repo.create({
        name: "test-delete",
        rule: "rule-delete",
      });

      yield* repo.del(styleToDelete.id);

      const styles = yield* repo.findAll();
      expect(styles).not.toContain(styleToDelete);
    }),
  );
});
