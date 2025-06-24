import { type AnyFormApi } from "@tanstack/react-form";
import { useBlocker } from "@tanstack/react-router";

export const useFormNavigationBlocker = (form: AnyFormApi, disabled = false) => {
  useBlocker({
    disabled: disabled || form.state.isSubmitting || !form.state.isDirty,
    shouldBlockFn: () => {
      const shouldLeave = confirm(
        "Are you sure you want to leave? Your changes will not be saved.",
      );
      return !shouldLeave;
    },
  });
};
