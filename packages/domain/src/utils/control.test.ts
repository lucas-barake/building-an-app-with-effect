import { describe, it } from "@effect/vitest";
import { deepStrictEqual } from "assert";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Control from "./control.js";

describe("whenOrFail", () => {
  it.effect("executes the effect when condition is true", () =>
    Effect.gen(function* () {
      const result = yield* Control.whenOrFail(
        Effect.succeed("success"),
        () => true,
        () => new Error("failure"),
      );
      deepStrictEqual(result, "success");
    }),
  );

  it.effect("fails with provided error when condition is false", () =>
    Effect.gen(function* () {
      const result = yield* Control.whenOrFail(
        Effect.succeed("success"),
        () => false,
        () => new Error("failure"),
      ).pipe(Effect.exit);
      deepStrictEqual(result, Exit.fail(new Error("failure")));
    }),
  );
});

describe("whenEffectOrFail", () => {
  it.effect("executes the effect when condition effect succeeds with true", () =>
    Effect.gen(function* () {
      const result = yield* Control.whenEffectOrFail(
        Effect.succeed("success"),
        Effect.succeed(true),
        () => new Error("failure"),
      );
      deepStrictEqual(result, "success");
    }),
  );

  it.effect("fails with provided error when condition effect succeeds with false", () =>
    Effect.gen(function* () {
      const result = yield* Control.whenEffectOrFail(
        Effect.succeed("success"),
        Effect.succeed(false),
        () => new Error("failure"),
      ).pipe(Effect.exit);
      deepStrictEqual(result, Exit.fail(new Error("failure")));
    }),
  );

  it.effect("propagates the error when condition effect fails", () =>
    Effect.gen(function* () {
      const conditionError = new Error("condition failed");
      const result = yield* Control.whenEffectOrFail(
        Effect.succeed("success"),
        Effect.fail(conditionError),
        () => new Error("failure"),
      ).pipe(Effect.exit);
      deepStrictEqual(result, Exit.fail(conditionError));
    }),
  );

  it.effect("prevents mutation when condition effect fails", () =>
    Effect.gen(function* () {
      let mutableValue = 0;

      const result = yield* Effect.sync(() => {
        mutableValue = 5;
        return "mutated";
      }).pipe(
        Control.whenEffectOrFail(
          Effect.fail(new Error("condition failed")),
          () => new Error("failure"),
        ),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
      deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
    }),
  );

  it.effect("prevents sequential mutations when condition effect fails", () =>
    Effect.gen(function* () {
      let mutableValue = 0;

      const result = yield* Effect.sync(() => {
        mutableValue += 5;
        return "first mutation";
      }).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            mutableValue += 5;
            return "second mutation";
          }),
        ),
        Control.whenEffectOrFail(
          Effect.fail(new Error("condition failed")),
          () => new Error("failure"),
        ),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
      deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred");
    }),
  );
});

describe("pre", () => {
  it.effect("runs the prerequisite effect before the main effect", () =>
    Effect.gen(function* () {
      const sequence: Array<string> = [];

      const prerequisite = Effect.sync(() => {
        sequence.push("prerequisite");
        return "prerequisite result";
      });

      const main = Effect.sync(() => {
        sequence.push("main");
        return "main result";
      });

      const result1 = yield* main.pipe(Control.pre(prerequisite));
      const result2 = yield* Control.pre(main, prerequisite);

      deepStrictEqual(result1, "main result", "Should return the main effect's result");
      deepStrictEqual(result2, "main result", "Should return the main effect's result");
      deepStrictEqual(
        sequence,
        ["prerequisite", "main", "prerequisite", "main"],
        "Prerequisite should run before main effect",
      );
    }),
  );

  it.effect("propagates errors from the prerequisite effect", () =>
    Effect.gen(function* () {
      const prerequisiteError = new Error("prerequisite failed");
      const prerequisite = Effect.fail(prerequisiteError);
      const main = Effect.succeed("main result");

      const result = yield* main.pipe(Control.pre(prerequisite), Effect.exit);

      deepStrictEqual(
        result,
        Exit.fail(prerequisiteError),
        "Should fail with the prerequisite's error",
      );
    }),
  );

  it.effect("prevents main effect from executing when prerequisite fails", () =>
    Effect.gen(function* () {
      let mainExecuted = false;

      const prerequisite = Effect.fail(new Error("prerequisite failed"));
      const main = Effect.sync(() => {
        mainExecuted = true;
        return "main result";
      });

      yield* main.pipe(Control.pre(prerequisite), Effect.exit);

      deepStrictEqual(
        mainExecuted,
        false,
        "Main effect should not execute when prerequisite fails",
      );
    }),
  );
});
