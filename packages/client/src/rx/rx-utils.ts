import { type Result, type Rx, useRxSetPromise, useRxValue } from "@effect-rx/rx-react";
import { Cause, Exit, identity } from "effect";
import React from "react";

export const useRxSetPromiseUnwrapped = <E, A, W>(rx: Rx.Writable<Result.Result<A, E>, W>) => {
  const set = useRxSetPromise(rx);
  return React.useCallback(
    (
      _: W,
      options?:
        | {
            readonly signal?: AbortSignal | undefined;
          }
        | undefined,
    ) =>
      set(_, options).then(
        Exit.match({
          onSuccess: identity,
          onFailure: (cause) => {
            throw Cause.squash(cause);
          },
        }),
      ),
    [set],
  );
};

export const useRxPromiseUnwrapped = <E, A, W>(rx: Rx.Writable<Result.Result<A, E>, W>) => {
  return [useRxValue(rx), useRxSetPromiseUnwrapped(rx)] as const;
};

export const useRxPromise = <E, A, W>(rx: Rx.Writable<Result.Result<A, E>, W>) => {
  return [useRxValue(rx), useRxSetPromise(rx)] as const;
};
