import { Cause, Effect, type Option } from "effect";
import { toast } from "sonner";

type ToastOptions<A, E, Args extends ReadonlyArray<any>> = {
  onWaiting: string | ((...args: Args) => string);
  onSuccess: string | ((a: A, ...args: Args) => string);
  onFailure: string | ((error: Option.Option<E>, ...args: Args) => string);
};

export const withToast = <A, E, Args extends ReadonlyArray<any>, R>(
  options: ToastOptions<A, E, Args>,
) =>
  Effect.fnUntraced(function* (self: Effect.Effect<A, E, R>, ...args: Args) {
    const toastId = toast.loading(
      typeof options.onWaiting === "string" ? options.onWaiting : options.onWaiting(...args),
    );
    return yield* self.pipe(
      Effect.tap((a) => {
        toast.success(
          typeof options.onSuccess === "string" ? options.onSuccess : options.onSuccess(a, ...args),
          { id: toastId },
        );
      }),
      Effect.tapErrorCause((cause) =>
        Effect.sync(() => {
          toast.error(
            typeof options.onFailure === "string"
              ? options.onFailure
              : options.onFailure(Cause.failureOption(cause), ...args),
            { id: toastId },
          );
        }),
      ),
    );
  });
