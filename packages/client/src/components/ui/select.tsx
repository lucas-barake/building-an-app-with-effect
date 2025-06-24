import { cn } from "@/lib/utils/cn";
import {
  Select as HeadlessSelect,
  type SelectProps as HeadlessSelectProps,
} from "@headlessui/react";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import * as React from "react";

type SelectProps = {
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  invalid?: boolean;
  loading?: boolean;
} & HeadlessSelectProps;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      children,
      className,
      defaultValue,
      disabled = false,
      invalid = false,
      loading = false,
      placeholder,
      value: controlledValue,
      ...props
    },
    ref,
  ) => {
    const hasPlaceholder = Boolean(placeholder);

    const isPlaceholderSelected =
      !loading &&
      hasPlaceholder &&
      (controlledValue === "" || controlledValue === undefined) &&
      (defaultValue === "" || defaultValue === undefined);

    return (
      <div className="relative">
        <HeadlessSelect
          ref={ref}
          value={controlledValue}
          defaultValue={defaultValue}
          className={cn(
            "flex h-9 w-full items-center rounded-md border border-input bg-transparent py-2 pr-8 pl-3 text-sm shadow-xs transition-[color,box-shadow] outline-none",
            "appearance-none",
            invalid
              ? "border-destructive ring-destructive/20 data-[focus]:border-destructive"
              : "data-[focus]:border-ring data-[focus]:ring-[3px] data-[focus]:ring-ring/50",
            (disabled || loading) && "cursor-not-allowed opacity-50",
            isPlaceholderSelected && !disabled && "text-muted-foreground",
            className,
          )}
          invalid={invalid}
          disabled={disabled || loading}
          {...props}
        >
          {loading ? (
            <option value="" disabled>
              Loading...
            </option>
          ) : (
            <React.Fragment>
              {hasPlaceholder && (
                <option value="" disabled hidden>
                  {placeholder}
                </option>
              )}
              {children}
            </React.Fragment>
          )}
        </HeadlessSelect>

        {loading ? (
          <Loader2Icon
            className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ChevronDownIcon
            className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export { Select };
export type { SelectProps };
