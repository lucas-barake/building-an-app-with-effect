import { Registry } from "@effect-rx/rx-react";
import { type StyleId, type UpsertStylePayload } from "@org/domain/api/styles-rpc";
import { Effect } from "effect";
import { rxRuntime } from "../rx/runtime";
import { ApiClient } from "../services/common/api-client";

export const stylesRx = rxRuntime.rx(
  Effect.fn(function* () {
    const api = yield* ApiClient;
    return yield* api.http.styles.list();
  }),
);

export const upsertStyleRx = rxRuntime.fn(
  Effect.fnUntraced(function* (payload: UpsertStylePayload) {
    const api = yield* ApiClient;
    const registry = yield* Registry.RxRegistry;

    yield* api.http.styles.upsert({ payload });
    registry.refresh(stylesRx);
  }),
);

export const deleteStyleRx = rxRuntime.fn(
  Effect.fn(function* (id: StyleId) {
    const api = yield* ApiClient;
    const registry = yield* Registry.RxRegistry;

    yield* api.http.styles.delete({ payload: { id } });
    registry.refresh(stylesRx);
  }),
);
