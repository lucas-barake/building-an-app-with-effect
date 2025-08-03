import { Rx } from "@effect-rx/rx-react";
import { Effect } from "effect";
import { rxRuntime } from "../rx/runtime";
import { ApiClient } from "../services/common/api-client";

export const stylesRx = rxRuntime.rx(
  Effect.fn(function* () {
    const api = yield* ApiClient;
    return yield* api.http.styles.list();
  }),
);

export const syncRx = Rx.make(null);
