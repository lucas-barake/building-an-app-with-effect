import { describe, expect, it } from "@effect/vitest";
import { EventStreamEvent } from "@org/domain/example-rpc";
import * as Effect from "effect/Effect";
import * as Mailbox from "effect/Mailbox";
import * as Option from "effect/Option";
import { EventStreamHub } from "./event-stream-hub.js";

const SampleEvent: EventStreamEvent = {
  _tag: "Ka",
};

describe("EventStreamHub", () => {
  it.scoped(
    "should register a connection and allow notifying all connections",
    () =>
      Effect.gen(function* () {
        const hub = yield* EventStreamHub;
        const mailbox =
          yield* Mailbox.make<EventStreamEvent>();
        const connectionId = "conn-1";

        yield* hub.registerConnection(
          connectionId,
          mailbox,
        );
        yield* hub.notifyAll(SampleEvent);

        const received = yield* mailbox.take;
        expect(received).toEqual(SampleEvent);

        yield* hub.unregisterConnection(connectionId);
      }).pipe(Effect.provide(EventStreamHub.Default)),
  );

  it.scoped(
    "should remove a connection and verify its mailbox shutdown",
    () =>
      Effect.gen(function* () {
        const hub = yield* EventStreamHub;
        const mailbox =
          yield* Mailbox.make<EventStreamEvent>();
        const connectionId = "conn-2";

        yield* hub.registerConnection(
          connectionId,
          mailbox,
        );

        const sizeBefore = yield* mailbox.size;
        expect(Option.isSome(sizeBefore)).toBe(true);
        const offerResultBefore =
          yield* mailbox.offer(SampleEvent);
        expect(offerResultBefore).toBe(true);
        yield* mailbox.take;

        yield* hub.unregisterConnection(connectionId);

        const sizeAfter = yield* mailbox.size;
        expect(Option.isNone(sizeAfter)).toBe(true);
        const offerResultAfter =
          yield* mailbox.offer(SampleEvent);
        expect(offerResultAfter).toBe(false);

        const result = yield* Effect.option(mailbox.take);
        expect(Option.isNone(result)).toBe(true);
      }).pipe(Effect.provide(EventStreamHub.Default)),
  );

  it.scoped(
    "should send a message to all registered connections",
    () =>
      Effect.gen(function* () {
        const hub = yield* EventStreamHub;
        const connectionId1 = "conn-3-1";
        const connectionId2 = "conn-3-2";
        const connectionId3 = "conn-3-3";
        const mailbox1 =
          yield* Mailbox.make<EventStreamEvent>();
        const mailbox2 =
          yield* Mailbox.make<EventStreamEvent>();
        const mailbox3 =
          yield* Mailbox.make<EventStreamEvent>();

        yield* hub.registerConnection(
          connectionId1,
          mailbox1,
        );
        yield* hub.registerConnection(
          connectionId2,
          mailbox2,
        );
        yield* hub.registerConnection(
          connectionId3,
          mailbox3,
        );

        yield* hub.notifyAll(SampleEvent);

        const received1 = yield* mailbox1.take;
        const received2 = yield* mailbox2.take;
        const received3 = yield* mailbox3.take;
        expect(received1).toEqual(SampleEvent);
        expect(received2).toEqual(SampleEvent);
        expect(received3).toEqual(SampleEvent);

        yield* hub.unregisterConnection(connectionId1);
        yield* hub.unregisterConnection(connectionId2);
        yield* hub.unregisterConnection(connectionId3);
      }).pipe(Effect.provide(EventStreamHub.Default)),
  );

  it.scoped(
    "should not fail when notifying with no connections",
    () =>
      Effect.gen(function* () {
        const hub = yield* EventStreamHub;

        yield* hub.notifyAll(SampleEvent);

        expect(true).toBe(true);
      }).pipe(Effect.provide(EventStreamHub.Default)),
  );

  it.scoped(
    "should handle removing a non-existent connection gracefully",
    () =>
      Effect.gen(function* () {
        const hub = yield* EventStreamHub;
        const connectionId = "conn-non-existent";

        yield* hub.unregisterConnection(connectionId);
        expect(true).toBe(true);
      }).pipe(Effect.provide(EventStreamHub.Default)),
  );

  it.scoped(
    "should not send to unregistered connections after removal",
    () =>
      Effect.gen(function* () {
        const hub = yield* EventStreamHub;
        const connId1 = "conn-5-1";
        const connId2 = "conn-5-2";
        const mailbox1 =
          yield* Mailbox.make<EventStreamEvent>();
        const mailbox2 =
          yield* Mailbox.make<EventStreamEvent>();

        yield* hub.registerConnection(connId1, mailbox1);
        yield* hub.registerConnection(connId2, mailbox2);

        yield* hub.notifyAll(SampleEvent);
        yield* mailbox1.take;
        yield* mailbox2.take;

        yield* hub.unregisterConnection(connId1);
        yield* hub.notifyAll(SampleEvent);

        const received2 = yield* mailbox2.take;
        expect(received2).toEqual(SampleEvent);

        const size1 = yield* mailbox1.size;
        expect(Option.isNone(size1)).toBe(true);

        yield* hub.unregisterConnection(connId2);
      }).pipe(Effect.provide(EventStreamHub.Default)),
  );

  it.scoped(
    "should shutdown all mailboxes when their connections are removed",
    () =>
      Effect.gen(function* () {
        const hub = yield* EventStreamHub;
        const connId1 = "conn-6-1";
        const connId2 = "conn-6-2";
        const mailbox1 =
          yield* Mailbox.make<EventStreamEvent>();
        const mailbox2 =
          yield* Mailbox.make<EventStreamEvent>();

        yield* hub.registerConnection(connId1, mailbox1);
        yield* hub.registerConnection(connId2, mailbox2);

        yield* hub.notifyAll(SampleEvent);
        yield* mailbox1.take;
        yield* mailbox2.take;

        yield* hub.unregisterConnection(connId1);
        yield* hub.unregisterConnection(connId2);

        yield* hub.notifyAll(SampleEvent);

        const sizeAfter1 = yield* mailbox1.size;
        const sizeAfter2 = yield* mailbox2.size;
        expect(Option.isNone(sizeAfter1)).toBe(true);
        expect(Option.isNone(sizeAfter2)).toBe(true);

        const offerAfter1 =
          yield* mailbox1.offer(SampleEvent);
        const offerAfter2 =
          yield* mailbox2.offer(SampleEvent);
        expect(offerAfter1).toBe(false);
        expect(offerAfter2).toBe(false);
      }).pipe(Effect.provide(EventStreamHub.Default)),
  );
});
