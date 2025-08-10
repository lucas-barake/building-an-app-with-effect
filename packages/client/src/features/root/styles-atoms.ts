import { makeAtomRuntime } from "@/atom/make-atom-runtime";
import { ApiClient } from "@/services/common/api-client";
import { Atom, Registry, Result } from "@effect-atom/atom-react";
import { type Style, type StyleId, type UpsertStylePayload } from "@org/domain/styles-rpc";
import { Array, Data, Effect } from "effect";

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
          return Array.prepend(result.value, style);
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
  Effect.fnUntraced(function* (payload: UpsertStylePayload) {
    const registry = yield* Registry.AtomRegistry;
    const api = yield* ApiClient;

    const style = yield* api.http.styles.upsert({ payload });
    registry.set(stylesAtom, Action.Upsert({ style }));
  }),
);

export const deleteStyleAtom = runtime.fn(
  Effect.fn(function* (id: StyleId) {
    const registry = yield* Registry.AtomRegistry;
    const api = yield* ApiClient;

    yield* api.http.styles.delete({ payload: { id } });
    registry.set(stylesAtom, Action.Del({ id }));
  }),
);
