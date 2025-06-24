/* eslint-disable @typescript-eslint/consistent-type-definitions */
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Scope from "effect/Scope";
import type * as Types from "effect/Types";
import * as internal from "./internal/manual-cache.js";

/**
 * A `ManualCache` is a key-value store with a specified capacity and time to live for entries,
 * requiring manual population via `set`.
 *
 * When the cache is at capacity, the least recently accessed entries will be removed.
 * Entries older than the specified time to live will be automatically removed when accessed or
 * periodically via a background process.
 *
 * The cache is safe for concurrent access.
 *
 * @since 1.0.0
 * @category models
 */
export interface ManualCache<in out Key, in out Value> extends ManualCache.Variance<Key, Value> {
  /**
   * Retrieves the value associated with the specified key if it exists and is not expired.
   * Otherwise returns Option.none. Updates LRU status on hit.
   */
  readonly get: (key: Key) => Effect.Effect<Option.Option<Value>>;

  /**
   * Associates the specified value with the specified key in the cache. Resets TTL.
   * Updates LRU status. May evict LRU entry if capacity is exceeded.
   */
  readonly set: (key: Key, value: Value) => Effect.Effect<void>;

  /**
   * Returns whether a non-expired value associated with the specified key exists in the cache.
   */
  readonly contains: (key: Key) => Effect.Effect<boolean>;

  /**
   * Invalidates the value associated with the specified key, removing it from the cache.
   */
  readonly invalidate: (key: Key) => Effect.Effect<void>;

  /**
   * Invalidates all values in the cache. Resets state including LRU list.
   */
  readonly invalidateAll: Effect.Effect<void>;

  /**
   * Returns the number of non-expired entries in the cache.
   */
  readonly size: Effect.Effect<number>;

  /**
   * Returns an array of non-expired keys currently in the cache. Order is not guaranteed.
   */
  readonly keys: Effect.Effect<Array<Key>>;

  /**
   * Returns an array of non-expired values currently in the cache. Order is not guaranteed.
   */
  readonly values: Effect.Effect<Array<Value>>;

  /**
   * Returns an array of non-expired [key, value] entries currently in the cache. Order is not guaranteed.
   */
  readonly entries: Effect.Effect<Array<[Key, Value]>>;

  /**
   * Manually triggers the removal of expired entries. The cache also does this periodically.
   */
  readonly evictExpired: () => Effect.Effect<void>;

  /**
   * Returns cache statistics (hits, misses, approximate total size).
   */
  readonly cacheStats: Effect.Effect<ManualCacheStats>;
}

/**
 * @since 1.0.0
 */
export declare namespace ManualCache {
  /**
   * Variance annotation for ManualCache.
   * @since 1.0.0
   * @category models
   */
  export interface Variance<in out Key, in out Value> {
    readonly [internal.ManualCacheTypeId]: {
      readonly _Key: Types.Invariant<Key>;
      readonly _Value: Types.Invariant<Value>;
    };
  }
}

/**
 * Statistics for a ManualCache instance.
 * @since 1.0.0
 * @category models
 */
export interface ManualCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly currentSize: number;
}

/**
 * Statistics for a specific entry within the ManualCache.
 * @since 1.0.0
 * @category models
 */
export interface EntryStats {
  readonly loadedMillis: number;
}

/**
 * Creates a new Manual Cache with the specified capacity and time to live.
 * Automatically starts a background fiber to periodically evict expired entries.
 *
 * The returned cache requires a `Scope` to manage the background eviction fiber.
 *
 * @param options Configuration options for the cache.
 * @param options.capacity The maximum number of entries the cache can hold. Must be >= 0.
 * @param options.timeToLive The duration for which entries are valid after being set.
 * @since 1.0.0
 * @category constructors
 */
export const make = <Key, Value = never>(options: {
  readonly capacity: number;
  readonly timeToLive: Duration.DurationInput;
}): Effect.Effect<ManualCache<Key, Value>, never, Scope.Scope> => internal.make(options);

/**
 * Returns an effect that caches its **successful** result with stale-while-revalidate behavior.
 *
 * **Details**
 *
 * This function provides cache-aside pattern with stale-while-revalidate strategy:
 * - On cache miss: blocks and waits for the effect to complete, then caches the result
 * - On cache hit (within TTL): returns cached value immediately
 * - On cache hit (expired): returns stale value immediately and triggers background refresh
 *
 * **When to Use**
 *
 * Use this when you need:
 * 1. Immediate responses even when cache is expired (serving stale data is acceptable)
 * 2. Background refresh to keep data relatively fresh
 * 3. High availability - stale data is better than no data
 * 4. Protection against duplicate expensive operations
 */
export const cacheSuccessSWR = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeToLiveInput: Duration.DurationInput,
): Effect.Effect<Effect.Effect<A, E, R>, never, Scope.Scope> =>
  Effect.gen(function* () {
    const scope = yield* Scope.Scope;
    const timeToLive = Duration.decode(timeToLiveInput);

    const cache = yield* Ref.make<Option.Option<readonly [expiry: number, value: A]>>(
      Option.none(),
    );
    const sem = yield* Effect.makeSemaphore(1);

    const protectedComputation = Effect.gen(function* () {
      const current = yield* Ref.get(cache);
      const now = yield* Clock.currentTimeMillis;
      if (Option.isSome(current)) {
        const [expiry] = current.value;
        if (now < expiry) {
          return current.value[1];
        }
      }

      const result = yield* self;
      yield* Ref.set(cache, Option.some([now + Duration.toMillis(timeToLive), result] as const));
      return result;
    }).pipe(sem.withPermits(1));

    return Effect.gen(function* () {
      const current = yield* Ref.get(cache);

      switch (current._tag) {
        case "None": {
          return yield* protectedComputation;
        }
        case "Some": {
          const [expiry, value] = current.value;
          const now = yield* Clock.currentTimeMillis;

          if (now < expiry) {
            return value;
          }

          yield* Effect.forkIn(protectedComputation, scope);

          return value;
        }
      }
    });
  });
