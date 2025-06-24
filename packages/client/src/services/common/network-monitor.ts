import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

export class NetworkMonitor extends Effect.Service<NetworkMonitor>()("NetworkMonitor", {
  scoped: Effect.gen(function* () {
    const isInitiallyOnline = window.navigator.onLine;
    const ref = yield* SubscriptionRef.make<boolean>(isInitiallyOnline);
    const latch = yield* Effect.makeLatch(isInitiallyOnline);

    yield* Stream.async<boolean>((emit) => {
      const onlineHandler = () => emit(Effect.succeed(Chunk.of(true)));
      const offlineHandler = () => emit(Effect.succeed(Chunk.of(false)));
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      window.addEventListener("online", onlineHandler);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      window.addEventListener("offline", offlineHandler);
    }).pipe(
      Stream.tap((isOnline) =>
        (isOnline ? latch.open : latch.close).pipe(
          Effect.zipRight(SubscriptionRef.update(ref, () => isOnline)),
        ),
      ),
      Stream.runDrain,
      Effect.forkScoped,
    );

    return { latch, ref };
  }),
  accessors: true,
}) {}
