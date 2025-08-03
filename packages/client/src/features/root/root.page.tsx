import { stylesRx } from "@/data-access/styles-rx";
import { Result, useRxValue } from "@effect-rx/rx-react";
import { constant } from "effect/Function";
import type React from "react";

export const RootPage: React.FC = () => {
  const stylesResult = useRxValue(stylesRx);
  return Result.matchWithWaiting(stylesResult, {
    onDefect: constant("Something went wrong..."),
    onError: (error) => error.message,
    onSuccess: (styles) => JSON.stringify(styles.value, null, 2),
    onWaiting: constant("Fetching..."),
  });
};
