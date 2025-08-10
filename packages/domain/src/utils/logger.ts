import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import type * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";

export const prefixLogs =
  (prefix: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.annotateLogs(effect, "__prefix", prefix);

export const prettyLoggerWithPrefix: Layer.Layer<never, never, never> = Logger.replace(
  Logger.defaultLogger,
  Logger.prettyLogger().pipe(
    Logger.mapInputOptions((options) => {
      const prefixAnnotation = HashMap.get(options.annotations, "__prefix");
      if (prefixAnnotation._tag === "Some") {
        const prefix = String(prefixAnnotation.value);
        const newAnnotations = HashMap.remove(options.annotations, "__prefix");

        const messageArray = Array.isArray(options.message) ? options.message : [options.message];
        const prefixedMessages =
          messageArray.length > 0
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              [`[${prefix}] ${messageArray[0]}`, ...messageArray.slice(1)]
            : [`[${prefix}]`];

        return {
          ...options,
          message: prefixedMessages,
          annotations: newAnnotations,
        };
      }
      return options;
    }),
  ),
);
