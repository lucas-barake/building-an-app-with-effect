import { makeAtomRuntime } from "@/atom/make-atom-runtime";
import { withToast } from "@/atom/with-toast";
import { ApiClient } from "@/services/common/api-client";
import { Atom, Registry, Result } from "@effect-atom/atom-react";
import { type Style, type StyleId, type UpsertStylePayload } from "@org/domain/styles-rpc";
import * as Arr from "effect/Array";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";

const runtime = makeAtomRuntime(ApiClient.Default);

const remoteAtom = runtime.atom(
  Effect.fn(function* () {
    const api = yield* ApiClient;
    return yield* api.http.styles.list();
  }),
);

type Action = Data.TaggedEnum<{
  Upsert: { readonly style: Style };
  Del: { readonly id: StyleId };
}>;
const Action = Data.taggedEnum<Action>();

export const stylesAtom = Object.assign(
  Atom.writable(
    (get: Atom.Context) => get(remoteAtom),
    (ctx, action: Action) => {
      const result = ctx.get(stylesAtom);
      if (!Result.isSuccess(result)) return;

      const update = Action.$match(action, {
        Del: ({ id }) => result.value.filter((style) => style.id !== id),
        Upsert: ({ style }) => {
          const existing = result.value.find((s) => s.id === style.id);
          if (existing) return result.value.map((s) => (s.id === style.id ? style : s));
          return Arr.prepend(result.value, style);
        },
      });

      ctx.setSelf(Result.success(update));
    },
  ),
  {
    remote: remoteAtom,
  },
);

export const upsertStyleAtom = runtime.fn(
  Effect.fn(
    function* (payload: UpsertStylePayload) {
      const registry = yield* Registry.AtomRegistry;
      const api = yield* ApiClient;

      const style = yield* api.http.styles.upsert({ payload });
      registry.set(stylesAtom, Action.Upsert({ style }));
    },
    withToast({
      onWaiting: (payload) => `${payload.id !== undefined ? "Updating" : "Creating"} style...`,
      onSuccess: "Style saved",
      onFailure: "Failed to save style",
    }),
  ),
);

export const deleteStyleAtom = runtime.fn(
  Effect.fn(
    function* (id: StyleId) {
      const registry = yield* Registry.AtomRegistry;
      const api = yield* ApiClient;

      yield* api.http.styles.delete({ payload: { id } });
      registry.set(stylesAtom, Action.Del({ id }));
    },
    withToast({
      onWaiting: "Deleting style...",
      onSuccess: "Style deleted",
      onFailure: "Failed to delete style",
    }),
  ),
);
