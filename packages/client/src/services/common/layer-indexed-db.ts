import * as PlatformError from "@effect/platform/Error";
import * as KeyValueStore from "@effect/platform/KeyValueStore";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

export const layerIndexedDB = (config: {
  dbName: string;
  storeName: string;
}): Layer.Layer<KeyValueStore.KeyValueStore, PlatformError.PlatformError> =>
  Layer.scoped(
    KeyValueStore.KeyValueStore,
    Effect.gen(function* () {
      const db = yield* Effect.async<IDBDatabase, PlatformError.PlatformError>((resume) => {
        const request = indexedDB.open(config.dbName, 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(config.storeName)) {
            db.createObjectStore(config.storeName);
          }
        };

        request.onsuccess = (event) => {
          resume(Effect.succeed((event.target as IDBOpenDBRequest).result));
        };

        request.onerror = (_event) => {
          resume(
            Effect.fail(
              new PlatformError.SystemError({
                reason: "Unknown",
                module: "KeyValueStore",
                method: "open",
                description: `Failed to open IndexedDB database "${config.dbName}"`,
                cause: request.error,
              }),
            ),
          );
        };
      });

      yield* Effect.async<boolean>((resume) => {
        navigator.storage
          .persisted()
          .then((isPersisted) => {
            if (isPersisted) {
              resume(Effect.succeed(true));
              return;
            }

            return navigator.storage.persist();
          })
          .then((persistent) => {
            if (persistent !== undefined) {
              resume(Effect.succeed(persistent));
            }
          })
          .catch(() => {
            resume(Effect.succeed(false));
          });
      }).pipe(Effect.tap((persistent) => Console.log(`Persistent storage: ${persistent}`)));

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          db.close();
        }),
      );

      const withStore = <A>(
        mode: IDBTransactionMode,
        f: (store: IDBObjectStore) => IDBRequest<A>,
      ): Effect.Effect<A, PlatformError.PlatformError> =>
        Effect.async<A, PlatformError.PlatformError>((resume) => {
          try {
            const transaction = db.transaction(config.storeName, mode);
            const store = transaction.objectStore(config.storeName);
            const request = f(store);

            request.onsuccess = () => {
              resume(Effect.succeed(request.result));
            };

            request.onerror = () => {
              resume(
                Effect.fail(
                  new PlatformError.SystemError({
                    reason: "Unknown",
                    module: "KeyValueStore",
                    method: "transaction",
                    description: `Transaction failed with mode "${mode}"`,
                    cause: request.error,
                  }),
                ),
              );
            };
          } catch (error) {
            resume(
              Effect.fail(
                new PlatformError.SystemError({
                  reason: "Unknown",
                  module: "KeyValueStore",
                  method: "transaction",
                  description: "Failed to create transaction",
                  cause: error,
                }),
              ),
            );
          }
        });

      const _get = (key: string): Effect.Effect<unknown, PlatformError.PlatformError> =>
        withStore("readonly", (store) => store.get(key));

      const encoder = new TextEncoder();

      return KeyValueStore.make({
        get: (key) =>
          _get(key).pipe(
            Effect.map((value) => {
              if (value === undefined) {
                return Option.none<string>();
              }
              if (typeof value === "string") {
                return Option.some(value);
              }
              return Option.some(Encoding.encodeBase64(value as Uint8Array));
            }),
          ),
        getUint8Array: (key) =>
          _get(key).pipe(
            Effect.map((value) => {
              if (value === undefined) {
                return Option.none<Uint8Array>();
              }
              if (value instanceof Uint8Array) {
                return Option.some(value);
              }
              return Option.some(encoder.encode(value as string));
            }),
          ),
        set: (key, value) =>
          withStore("readwrite", (store) => store.put(value, key)).pipe(Effect.asVoid),
        remove: (key) => withStore("readwrite", (store) => store.delete(key)).pipe(Effect.asVoid),
        clear: withStore("readwrite", (store) => store.clear()).pipe(Effect.asVoid),
        size: withStore("readonly", (store) => store.count()),
        modifyUint8Array: () => Effect.die("Not implemented"),
      });
    }),
  );
