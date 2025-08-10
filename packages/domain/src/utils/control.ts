import * as Effect from "effect/Effect";
import { type LazyArg, dual } from "effect/Function";

/**
 * Runs a prerequisite effect before the main effect.
 * The result of the prerequisite effect is discarded, and the result of the main effect is returned.
 * This is equivalent to `Effect.zipRight(prerequisite, self)`.
 */
export const pre: {
  <B, E2, R2>(
    prerequisite: Effect.Effect<B, E2, R2>,
  ): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E2, R | R2>;
  <A, E, R, B, E2, R2>(
    self: Effect.Effect<A, E, R>,
    prerequisite: Effect.Effect<B, E2, R2>,
  ): Effect.Effect<A, E | E2, R | R2>;
} = dual(
  2,
  <A, E, R, B, E2, R2>(
    self: Effect.Effect<A, E, R>,
    prerequisite: Effect.Effect<B, E2, R2>,
  ): Effect.Effect<A, E | E2, R | R2> => Effect.zipRight(prerequisite, self),
);

/**
 * Conditionally executes an effect based on a boolean condition.
 * If the condition is false, fails with the provided error.
 * Useful for enforcing preconditions before executing effects.
 */
export const whenOrFail: {
  <A, E, R, E2>(
    condition: LazyArg<boolean>,
    orFailWith: LazyArg<E2>,
  ): (self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E2, R>;
  <A, E, R, E2>(
    self: Effect.Effect<A, E, R>,
    condition: LazyArg<boolean>,
    orFailWith: LazyArg<E2>,
  ): Effect.Effect<A, E | E2, R>;
} = dual(
  3,
  <A, E, R, E2>(
    self: Effect.Effect<A, E, R>,
    condition: LazyArg<boolean>,
    orFailWith: LazyArg<E2>,
  ): Effect.Effect<A, E | E2, R> =>
    // @ts-expect-error - Effect.fail returns Effect<never, E2> and TypeScript tries to unify the success types (A | never).
    // At runtime, Effect.fail short-circuits execution, so the success type is actually just A when the condition is true.
    Effect.flatMap(Effect.sync(condition), (bool) => (bool ? self : Effect.fail(orFailWith()))),
);

/**
 * Similar to `whenOrFail` but accepts an effectful condition that may fail.
 * Executes the main effect only if the condition effect resolves to true,
 * otherwise fails with the provided error.
 */
export const whenEffectOrFail: {
  <E2, R2, E3>(
    condition: Effect.Effect<boolean, E2, R2>,
    orFailWith: LazyArg<E3>,
  ): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E2 | E3, R | R2>;
  <A, E, R, E2, R2, E3>(
    self: Effect.Effect<A, E, R>,
    condition: Effect.Effect<boolean, E2, R2>,
    orFailWith: LazyArg<E3>,
  ): Effect.Effect<A, E | E2 | E3, R | R2>;
} = dual(
  3,
  <A, E, R, E2, R2, E3>(
    self: Effect.Effect<A, E, R>,
    condition: Effect.Effect<boolean, E2, R2>,
    orFailWith: LazyArg<E3>,
  ): Effect.Effect<A, E | E2 | E3, R | R2> =>
    // @ts-expect-error - Effect.fail returns Effect<never, E3> and TypeScript tries to unify the success types (A | never).
    // At runtime, Effect.fail short-circuits execution, so the success type is actually just A when the condition is true.
    Effect.flatMap(condition, (bool) => (bool ? self : Effect.fail(orFailWith()))),
);
