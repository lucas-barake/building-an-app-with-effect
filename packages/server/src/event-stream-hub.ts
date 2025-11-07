import { EventStreamEvent } from "@org/domain/example-rpc";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import type * as Mailbox from "effect/Mailbox";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import * as SynchronizedRef from "effect/SynchronizedRef";

type ActiveConnection = {
  readonly connectionId: string;
  readonly mailbox: Mailbox.Mailbox<EventStreamEvent>;
  lastActivityTimestamp: number;
};

export class EventStreamHub extends Effect.Service<EventStreamHub>()(
  "EventStreamHub",
  {
    scoped: Effect.gen(function* () {
      const connections = yield* SynchronizedRef.make(
        MutableHashMap.empty<string, ActiveConnection>(),
      );

      const registerConnection = (
        connectionId: string,
        mailbox: Mailbox.Mailbox<EventStreamEvent>,
      ): Effect.Effect<void> =>
        SynchronizedRef.updateEffect(connections, (map) =>
          Clock.currentTimeMillis.pipe(
            Effect.map((now) => {
              const activeConnection: ActiveConnection = {
                connectionId,
                mailbox,
                lastActivityTimestamp: now,
              };

              return MutableHashMap.set(
                map,
                connectionId,
                activeConnection,
              );
            }),
            Effect.tap(() =>
              Effect.logDebug("Registered connection"),
            ),
          ),
        );

      const unregisterConnection = (
        connectionId: string,
      ): Effect.Effect<void> =>
        SynchronizedRef.updateEffect(connections, (map) => {
          const connectionOpt = MutableHashMap.get(
            map,
            connectionId,
          );

          if (Option.isNone(connectionOpt)) {
            return Effect.succeed(map);
          }

          MutableHashMap.remove(map, connectionId);

          return connectionOpt.value.mailbox.shutdown.pipe(
            Effect.as(map),
            Effect.tap(() =>
              Effect.logDebug("Unregistered connection"),
            ),
          );
        });

      const notifyAll = (
        event: EventStreamEvent,
      ): Effect.Effect<void> =>
        SynchronizedRef.updateEffect(connections, (map) =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) => {
              const allConnections = Array.from(
                MutableHashMap.values(map),
              );

              if (allConnections.length === 0) {
                return Effect.succeed(map);
              }

              return Effect.forEach(
                allConnections,
                (conn) =>
                  conn.mailbox.offer(event).pipe(
                    Effect.tap((success) => {
                      if (success) {
                        conn.lastActivityTimestamp = now;
                      } else {
                        return Effect.logWarning(
                          `Mailbox ${conn.connectionId} is already done, skipping send.`,
                        );
                      }
                    }),
                  ),
                { discard: true },
              ).pipe(Effect.as(map));
            }),
          ),
        );

      return {
        registerConnection,
        unregisterConnection,
        notifyAll,
      };
    }),
  },
) {}
