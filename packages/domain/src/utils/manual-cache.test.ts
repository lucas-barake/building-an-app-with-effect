import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Ref from "effect/Ref";
import * as TestClock from "effect/TestClock";
import { strictEqual } from "node:assert";
import * as Cache from "./manual-cache.js";

describe("Cache", () => {
  it.scoped("should handle basic set and get operations", () =>
    Effect.gen(function* () {
      const cache = yield* Cache.make<string, string>({
        capacity: 100,
        timeToLive: "1 hour",
      });

      yield* cache.set("key", "value");
      const value = yield* cache.get("key");

      strictEqual(value._tag, "Some");
      strictEqual(value.value, "value");
    }),
  );

  it.scoped("should respect TTL and expire items", () =>
    Effect.gen(function* () {
      const cache = yield* Cache.make<string, string>({
        capacity: 100,
        timeToLive: "1 second",
      });

      yield* cache.set("key", "value");
      yield* TestClock.adjust("2 seconds");
      const value = yield* cache.get("key");

      strictEqual(value._tag, "None");
    }),
  );

  it.scoped("should respect capacity limits", () =>
    Effect.gen(function* () {
      const cache = yield* Cache.make<string, string>({
        capacity: 2,
        timeToLive: "1 hour",
      });

      yield* cache.set("key1", "value1");
      yield* cache.set("key2", "value2");
      yield* cache.set("key3", "value3");

      const size = yield* cache.size;
      const key1Value = yield* cache.get("key1");
      const key3Value = yield* cache.get("key3");

      strictEqual(size, 2);
      strictEqual(key1Value._tag, "None"); // LRU evicted
      strictEqual(key3Value._tag, "Some");
    }),
  );

  it.scoped("should handle invalidation correctly", () =>
    Effect.gen(function* () {
      const cache = yield* Cache.make<string, string>({
        capacity: 100,
        timeToLive: "1 hour",
      });

      yield* cache.set("key", "value");
      yield* cache.invalidate("key");
      const value = yield* cache.get("key");

      strictEqual(value._tag, "None");
    }),
  );

  it.scoped("should handle invalidateAll correctly", () =>
    Effect.gen(function* () {
      const cache = yield* Cache.make<string, string>({
        capacity: 100,
        timeToLive: "1 hour",
      });

      yield* cache.set("key1", "value1");
      yield* cache.set("key2", "value2");
      yield* cache.invalidateAll;

      const size = yield* cache.size;
      strictEqual(size, 0);
    }),
  );

  describe("cacheSuccessSWR", () => {
    it.scoped("should block and wait on initial cache miss", () =>
      Effect.gen(function* () {
        const executionCount = yield* Ref.make(0);
        const underlyingEffect = Ref.updateAndGet(executionCount, (n) => n + 1).pipe(
          Effect.delay("100 millis"),
          Effect.map((count) => `Success ${count}`),
        );

        const cachedEffect = yield* Cache.cacheSuccessSWR(underlyingEffect, "10 seconds");

        const startTime = yield* TestClock.currentTimeMillis;
        const fiber = yield* Effect.fork(cachedEffect);
        yield* TestClock.adjust("100 millis");
        const res1 = yield* Fiber.join(fiber);
        const endTime = yield* TestClock.currentTimeMillis;

        strictEqual(res1, "Success 1");
        expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      }),
    );

    it.scoped("should return cached value immediately when not expired", () =>
      Effect.gen(function* () {
        const executionCount = yield* Ref.make(0);
        const underlyingEffect = Ref.updateAndGet(executionCount, (n) => n + 1).pipe(
          Effect.delay("100 millis"),
          Effect.map((count) => `Success ${count}`),
        );

        const cachedEffect = yield* Cache.cacheSuccessSWR(underlyingEffect, "10 seconds");

        const fiber1 = yield* Effect.fork(cachedEffect);
        yield* TestClock.adjust("100 millis");
        yield* Fiber.join(fiber1);

        const startTime = yield* TestClock.currentTimeMillis;
        const res2 = yield* cachedEffect;
        const endTime = yield* TestClock.currentTimeMillis;

        strictEqual(res2, "Success 1");
        strictEqual(endTime - startTime, 0);
      }),
    );

    it.scoped("should return stale value immediately and refresh in background when expired", () =>
      Effect.gen(function* () {
        const executionCount = yield* Ref.make(0);
        const underlyingEffect = Ref.updateAndGet(executionCount, (n) => n + 1).pipe(
          Effect.delay("100 millis"),
          Effect.map((count) => `Success ${count}`),
        );

        const cachedEffect = yield* Cache.cacheSuccessSWR(underlyingEffect, "5 seconds");

        const fiber1 = yield* Effect.fork(cachedEffect);
        yield* TestClock.adjust("100 millis");
        yield* Fiber.join(fiber1);

        yield* TestClock.adjust("6 seconds");

        const startTime = yield* TestClock.currentTimeMillis;
        const res2 = yield* cachedEffect;
        const endTime = yield* TestClock.currentTimeMillis;

        strictEqual(res2, "Success 1"); // Stale value
        strictEqual(endTime - startTime, 0); // Immediate

        yield* TestClock.adjust("200 millis");
        yield* Effect.yieldNow();

        const res3 = yield* cachedEffect;
        strictEqual(res3, "Success 2");
      }),
    );

    it.scoped("should handle background refresh failures gracefully", () =>
      Effect.gen(function* () {
        const executionCount = yield* Ref.make(0);
        const underlyingEffect = Ref.updateAndGet(executionCount, (n) => n + 1).pipe(
          Effect.flatMap((count) =>
            count === 1 ? Effect.succeed(`Success ${count}`) : Effect.fail(`Error ${count}`),
          ),
        );

        const cachedEffect = yield* Cache.cacheSuccessSWR(underlyingEffect, "5 seconds");

        const res1 = yield* cachedEffect;
        strictEqual(res1, "Success 1");

        yield* TestClock.adjust("6 seconds");

        const res2 = yield* cachedEffect;
        strictEqual(res2, "Success 1");

        yield* TestClock.adjust("100 millis");
        yield* Effect.yieldNow();

        const finalCount = yield* Ref.get(executionCount);
        strictEqual(finalCount, 2);
      }),
    );
  });
});
