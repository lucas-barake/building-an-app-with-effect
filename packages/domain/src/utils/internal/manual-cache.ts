/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type * as Clock from "effect/Clock";
import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as MutableHashMap from "effect/MutableHashMap";
import * as MutableQueue from "effect/MutableQueue";
import * as MutableRef from "effect/MutableRef";
import * as Option from "effect/Option";
import { hasProperty } from "effect/Predicate";
import * as Schedule from "effect/Schedule";
import type * as Scope from "effect/Scope";

/**
 * Type ID for the ManualCache interface.
 * @since 1.0.0
 * @category symbols
 */
export const ManualCacheTypeId = Symbol.for("@app/ManualCache");
export type ManualCacheTypeId = typeof ManualCacheTypeId;

/**
 * Type ID for the internal MapKey structure used by ManualCache.
 * @since 1.0.0
 * @category symbols
 */
export const MapKeyTypeId = Symbol.for("@app/ManualCache/MapKey");
export type MapKeyTypeId = typeof MapKeyTypeId;

/**
 * A Manual Cache that stores key-value pairs up to a specified capacity,
 * automatically evicting the least recently used items when full.
 * Entries also expire after a specified time-to-live (TTL).
 * Requires manual population via `set`.
 *
 * @since 1.0.0
 * @category models
 */
export type ManualCache<in out Key, in out Value> = {
  readonly [ManualCacheTypeId]: {
    readonly _Key: (_: Key) => Key;
    readonly _Value: (_: Value) => Value;
  };
  /** Retrieves the value if present and not expired, updating LRU status. */
  readonly get: (key: Key) => Effect.Effect<Option.Option<Value>>;
  /** Sets/updates a value, resetting TTL and updating LRU status. Evicts if capacity exceeded. */
  readonly set: (key: Key, value: Value) => Effect.Effect<void>;
  /** Checks if a key exists and is not expired. */
  readonly contains: (key: Key) => Effect.Effect<boolean>;
  /** Removes a key from the cache. */
  readonly invalidate: (key: Key) => Effect.Effect<void>;
  /** Removes all keys from the cache. */
  readonly invalidateAll: Effect.Effect<void>;
  /** Returns the number of non-expired entries in the cache. */
  readonly size: Effect.Effect<number>;
  /** Returns an array of non-expired keys. */
  readonly keys: Effect.Effect<Array<Key>>;
  /** Returns an array of non-expired values. */
  readonly values: Effect.Effect<Array<Value>>;
  /** Returns an array of non-expired [key, value] entries. */
  readonly entries: Effect.Effect<Array<[Key, Value]>>;
  /** Manually triggers the removal of expired entries. */
  readonly evictExpired: () => Effect.Effect<void>;
  /** Returns cache statistics (hits, misses, approximate total size). */
  readonly cacheStats: Effect.Effect<ManualCacheStats>;
};

/**
 * Statistics for a ManualCache instance.
 * @since 1.0.0
 * @category models
 */
export type ManualCacheStats = {
  readonly hits: number;
  readonly misses: number;
  readonly currentSize: number;
};

/**
 * Statistics for a specific entry within the ManualCache.
 * @since 1.0.0
 * @category models
 */
export type EntryStats = {
  readonly loadedMillis: number;
};

/**
 * Internal representation of a key in the LRU list.
 * @since 1.0.0
 * @category models
 */
export interface MapKey<out K> extends Equal.Equal {
  readonly [MapKeyTypeId]: MapKeyTypeId;
  readonly current: K;
  previous: MapKey<K> | undefined;
  next: MapKey<K> | undefined;
}

/**
 * Internal representation of a value stored in the ManualCache map.
 * @since 1.0.0
 * @category models
 */
export type MapValue<Key, Value> = Complete<Key, Value>;

/**
 * Represents a complete (non-pending) entry in the ManualCache.
 * @since 1.0.0
 * @category models
 */
export type Complete<out Key, out Value> = {
  readonly _tag: "Complete";
  readonly key: MapKey<Key>;
  readonly value: Value;
  readonly entryStats: EntryStats;
  readonly expireAtMillis: number;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const complete = <Key, Value>(
  key: MapKey<Key>,
  value: Value,
  entryStats: EntryStats,
  expireAtMillis: number,
): MapValue<Key, Value> =>
  Data.struct({
    _tag: "Complete" as const,
    key,
    value,
    entryStats,
    expireAtMillis,
  });

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeMapKey = <K>(current: K): MapKey<K> => new MapKeyImpl(current);

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMapKey = (u: unknown): u is MapKey<unknown> => hasProperty(u, MapKeyTypeId);

class MapKeyImpl<out K> implements MapKey<K> {
  public readonly [MapKeyTypeId]: MapKeyTypeId = MapKeyTypeId;
  public previous: MapKey<K> | undefined = undefined;
  public next: MapKey<K> | undefined = undefined;
  constructor(public readonly current: K) {}
  public [Hash.symbol](): number {
    return Hash.hash(this.current);
  }
  public [Equal.symbol](that: unknown): boolean {
    return this === that || (isMapKey(that) && Equal.equals(this.current, that.current));
  }
}

/**
 * Doubly linked list implementation for LRU tracking.
 * @since 1.0.0
 * @category models
 */
export type KeySet<in out K> = {
  head: MapKey<K> | undefined;
  tail: MapKey<K> | undefined;
  add(key: MapKey<K>): void;
  remove(): MapKey<K> | undefined;
};

class KeySetImpl<in out K> implements KeySet<K> {
  public head: MapKey<K> | undefined = undefined;
  public tail: MapKey<K> | undefined = undefined;

  private removeNode(key: MapKey<K>): void {
    if (key.previous !== undefined) {
      key.previous.next = key.next;
    } else {
      this.head = key.next;
    }
    if (key.next !== undefined) {
      key.next.previous = key.previous;
    } else {
      this.tail = key.previous;
    }
    key.previous = undefined;
    key.next = undefined;
  }

  public add(key: MapKey<K>): void {
    if (key.previous !== undefined || key.next !== undefined || this.head === key) {
      this.removeNode(key);
    }
    if (this.tail === undefined) {
      this.head = key;
      this.tail = key;
    } else {
      this.tail.next = key;
      key.previous = this.tail;
      this.tail = key;
      key.next = undefined;
    }
  }

  public remove(): MapKey<K> | undefined {
    const key = this.head;
    if (key !== undefined) {
      this.removeNode(key);
    }
    return key;
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeKeySet = <K>(): KeySet<K> => new KeySetImpl<K>();

/**
 * Mutable state of the ManualCache.
 * @since 1.0.0
 * @category models
 */
export type ManualCacheState<in out Key, in out Value> = {
  map: MutableHashMap.MutableHashMap<Key, MapValue<Key, Value>>;
  keys: KeySet<Key>;
  accesses: MutableQueue.MutableQueue<MapKey<Key>>;
  updating: MutableRef.MutableRef<boolean>;
  hits: MutableRef.MutableRef<number>;
  misses: MutableRef.MutableRef<number>;
};

/**
 * Constructs the mutable state for a ManualCache.
 * @since 1.0.0
 * @category constructors
 */
export const makeManualCacheState = <Key, Value>(
  map: MutableHashMap.MutableHashMap<Key, MapValue<Key, Value>>,
  keys: KeySet<Key>,
  accesses: MutableQueue.MutableQueue<MapKey<Key>>,
  updating: MutableRef.MutableRef<boolean>,
  hits: MutableRef.MutableRef<number>,
  misses: MutableRef.MutableRef<number>,
): ManualCacheState<Key, Value> => ({
  map,
  keys,
  accesses,
  updating,
  hits,
  misses,
});

/**
 * Creates the initial mutable state for a ManualCache.
 * @since 1.0.0
 * @category constructors
 */
export const initialManualCacheState = <Key, Value>(): ManualCacheState<Key, Value> =>
  makeManualCacheState(
    MutableHashMap.empty(),
    makeKeySet(),
    MutableQueue.unbounded(),
    MutableRef.make(false),
    MutableRef.make(0),
    MutableRef.make(0),
  );

class ManualCacheImpl<in out Key, in out Value> implements ManualCache<Key, Value> {
  public readonly [ManualCacheTypeId] = {
    _Key: (_: Key) => _,
    _Value: (_: Value) => _,
  };

  public readonly cacheState: ManualCacheState<Key, Value>;

  constructor(
    public readonly capacity: number,
    public readonly timeToLive: Duration.Duration,
  ) {
    this.cacheState = initialManualCacheState();
  }

  private trackAccess(key: MapKey<Key>): void {
    MutableQueue.offer(this.cacheState.accesses, key);
    if (MutableRef.compareAndSet(this.cacheState.updating, false, true)) {
      try {
        let loop = true;
        while (loop) {
          const keyToUpdate = MutableQueue.poll(
            this.cacheState.accesses,
            MutableQueue.EmptyMutableQueue,
          );
          if (keyToUpdate === MutableQueue.EmptyMutableQueue) {
            loop = false; // Queue is empty
          } else {
            const currentEntry = Option.getOrUndefined(
              MutableHashMap.get(this.cacheState.map, keyToUpdate.current),
            );
            if (currentEntry !== undefined && currentEntry.key === keyToUpdate) {
              this.cacheState.keys.add(keyToUpdate); // Update LRU order (move to tail)
            }
          }
        }

        let currentSize = MutableHashMap.size(this.cacheState.map);
        while (currentSize > this.capacity) {
          const keyToRemove = this.cacheState.keys.remove();
          if (keyToRemove !== undefined) {
            if (MutableHashMap.has(this.cacheState.map, keyToRemove.current)) {
              MutableHashMap.remove(this.cacheState.map, keyToRemove.current);
              currentSize--;
            }
          } else {
            break;
          }
        }
      } finally {
        MutableRef.set(this.cacheState.updating, false);
      }
    }
  }

  private hasExpired(clock: Clock.Clock, expireAtMillis: number): boolean {
    return clock.unsafeCurrentTimeMillis() >= expireAtMillis;
  }

  private trackHit(): void {
    MutableRef.set(this.cacheState.hits, MutableRef.get(this.cacheState.hits) + 1);
  }

  private trackMiss(): void {
    MutableRef.set(this.cacheState.misses, MutableRef.get(this.cacheState.misses) + 1);
  }

  private *nonExpiredEntries(clock: Clock.Clock) {
    for (const [key, mapValue] of this.cacheState.map) {
      if (!this.hasExpired(clock, mapValue.expireAtMillis)) {
        yield [key, mapValue.value] as const;
      }
    }
  }

  public get(key: Key): Effect.Effect<Option.Option<Value>> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        const mapValueOpt = MutableHashMap.get(this.cacheState.map, key);
        if (Option.isNone(mapValueOpt)) {
          this.trackMiss();
          return Option.none();
        }
        const mapValue = mapValueOpt.value;
        if (this.hasExpired(clock, mapValue.expireAtMillis)) {
          this.trackMiss();
          MutableHashMap.remove(this.cacheState.map, key);
          return Option.none();
        }
        this.trackHit();
        this.trackAccess(mapValue.key);
        return Option.some(mapValue.value);
      }),
    );
  }

  public set(key: Key, value: Value): Effect.Effect<void> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        const now = clock.unsafeCurrentTimeMillis();
        const expireAtMillis = now + Duration.toMillis(this.timeToLive);
        const entryStats: EntryStats = { loadedMillis: now };
        let mapKey: MapKey<Key>;
        const existingEntryOpt = MutableHashMap.get(this.cacheState.map, key);
        if (Option.isSome(existingEntryOpt)) {
          mapKey = existingEntryOpt.value.key;
        } else {
          mapKey = makeMapKey(key);
        }
        const newMapValue = complete(mapKey, value, entryStats, expireAtMillis);
        MutableHashMap.set(this.cacheState.map, key, newMapValue);
        this.trackAccess(mapKey);
      }),
    );
  }

  public contains(key: Key): Effect.Effect<boolean> {
    return Effect.map(this.get(key), Option.isSome);
  }

  public invalidate(key: Key): Effect.Effect<void> {
    return Effect.sync(() => {
      MutableHashMap.remove(this.cacheState.map, key);
    });
  }

  public invalidateAll = Effect.sync(() => {
    this.cacheState.map = MutableHashMap.empty();
    this.cacheState.keys.head = undefined;
    this.cacheState.keys.tail = undefined;
    while (
      MutableQueue.poll(this.cacheState.accesses, MutableQueue.EmptyMutableQueue) !==
      MutableQueue.EmptyMutableQueue
    ) {
      // draining
    }
    MutableRef.set(this.cacheState.hits, 0);
    MutableRef.set(this.cacheState.misses, 0);
  });

  public get size(): Effect.Effect<number> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        let count = 0;
        for (const [_key, mapValue] of this.cacheState.map) {
          if (!this.hasExpired(clock, mapValue.expireAtMillis)) {
            count++;
          }
        }
        return count;
      }),
    );
  }

  public get values(): Effect.Effect<Array<Value>> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        const valuesArray: Array<Value> = [];
        for (const [_key, value] of this.nonExpiredEntries(clock)) {
          valuesArray.push(value);
        }
        return valuesArray;
      }),
    );
  }

  public get entries(): Effect.Effect<Array<[Key, Value]>> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        const entriesArray: Array<[Key, Value]> = [];
        for (const [key, value] of this.nonExpiredEntries(clock)) {
          entriesArray.push([key, value]);
        }
        return entriesArray;
      }),
    );
  }

  public get keys(): Effect.Effect<Array<Key>> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        const keysArray: Array<Key> = [];
        for (const [key, _value] of this.nonExpiredEntries(clock)) {
          keysArray.push(key);
        }
        return keysArray;
      }),
    );
  }

  public evictExpired(): Effect.Effect<void> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        for (const [key, mapValue] of this.cacheState.map) {
          if (this.hasExpired(clock, mapValue.expireAtMillis)) {
            MutableHashMap.remove(this.cacheState.map, key);
          }
        }
      }),
    );
  }

  public get cacheStats(): Effect.Effect<ManualCacheStats> {
    return Effect.sync(() => ({
      hits: MutableRef.get(this.cacheState.hits),
      misses: MutableRef.get(this.cacheState.misses),
      currentSize: MutableHashMap.size(this.cacheState.map),
    }));
  }
}

/**
 * Creates a new Manual Cache with specified capacity and time-to-live.
 * Automatically starts a background fiber to periodically evict expired entries.
 *
 * The returned cache requires a `Scope` to manage the background eviction fiber.
 *
 * @param options Configuration options for the cache.
 * @param options.capacity The maximum number of entries the cache can hold.
 * @param options.timeToLive The duration for which entries are valid after being set.
 * @since 1.0.0
 * @category constructors
 */
export const make = <Key, Value>(options: {
  readonly capacity: number;
  readonly timeToLive: Duration.DurationInput;
}): Effect.Effect<ManualCache<Key, Value>, never, Scope.Scope> => {
  const timeToLive = Duration.decode(options.timeToLive);
  const capacity = Math.max(0, options.capacity);

  return Effect.sync(() => new ManualCacheImpl<Key, Value>(capacity, timeToLive)).pipe(
    Effect.flatMap((cache) => {
      const evictionInterval = Duration.millis(Math.max(1000, Duration.toMillis(timeToLive)));

      const periodicEviction = Effect.repeat(
        cache.evictExpired(),
        Schedule.fixed(evictionInterval),
      );

      return Effect.forkScoped(periodicEviction).pipe(Effect.as(cache));
    }),
  );
};
