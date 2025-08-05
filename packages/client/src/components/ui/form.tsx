import { cn } from "@/lib/utils/cn";
import * as String from "effect/String";
import React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Select, type SelectProps } from "./select";
import { Textarea } from "./textarea";

const FormControl: React.FC<React.ComponentProps<"div">> = ({ children, ...props }) => {
  return (
    <div className="flex flex-col gap-1.5" {...props}>
      {children}
    </div>
  );
};

const FieldError: React.FC<
  Omit<React.ComponentProps<"span">, "children"> & {
    error?: string | null | undefined;
    fieldApi?: never;
  }
> = ({ className, error = null, ...props }) => {
  if (error === null || String.isEmpty(error)) return null;

  return (
    <span className={cn("text-sm text-red-500 dark:text-red-400", className)} {...props}>
      {error}
    </span>
  );
};

const FieldDescription: React.FC<
  Omit<React.ComponentProps<"p">, "children"> & {
    description: string;
  }
> = ({ className, description, ...props }) => {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {description}
    </p>
  );
};

type FieldInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: React.ReactNode;
  name: string;
  error?: string | null | undefined;
  controlClassName?: string;
  description?: string;
};
export const FieldInput: React.FC<FieldInputProps> = ({
  className,
  controlClassName,
  description,
  error,
  label,
  name,
  required,
  ...inputProps
}) => {
  return (
    <FormControl className={controlClassName}>
      <Label htmlFor={name} required={required === true}>
        {label}
      </Label>
      {description && <FieldDescription description={description} />}
      <Input id={name} name={name} required={required} className={className} {...inputProps} />
      <FieldError error={error} />
    </FormControl>
  );
};

type FieldTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: React.ReactNode;
  name: string;
  error?: string | null | undefined;
  controlClassName?: string;
  ref?: React.Ref<HTMLTextAreaElement>;
};
export const FieldTextarea: React.FC<FieldTextareaProps> = ({
  className,
  controlClassName,
  error,
  label,
  name,
  required,
  ...textareaProps
}) => {
  return (
    <FormControl className={controlClassName}>
      <Label htmlFor={name} required={required === true}>
        {label}
      </Label>
      <Textarea
        id={name}
        name={name}
        required={required}
        className={className}
        {...textareaProps}
      />
      <FieldError error={error} />
    </FormControl>
  );
};

type FieldSelectOption = {
  label: React.ReactNode;
  value: string | number;
};

type FieldSelectProps = Omit<SelectProps, "children" | "id" | "placeholder"> & {
  label: React.ReactNode;
  name: string;
  error?: string | null | undefined;
  controlClassName?: string;
  options: ReadonlyArray<FieldSelectOption>;
  noOptionsText?: string;
  required?: boolean;
  placeholder: string;
};

const FieldSelect: React.FC<FieldSelectProps> = ({
  controlClassName,
  disabled = false,
  error,
  label,
  loading = false,
  name,
  noOptionsText,
  options: userOptions,
  placeholder,
  required,
  ...restSelectProps
}) => {
  const finalOptions: Array<FieldSelectOption> = [];

  finalOptions.push({ label: placeholder, value: "" });
  // eslint-disable-next-line no-restricted-syntax
  finalOptions.push(...userOptions);

  const hasUserOptions = userOptions.length > 0;
  const showNoOptionsMessageAndDisable = !loading && !hasUserOptions && Boolean(noOptionsText);

  return (
    <FormControl className={controlClassName}>
      <Label htmlFor={name} required={required === true}>
        {label}
      </Label>

      <Select
        id={name}
        name={name}
        required={required}
        loading={loading}
        disabled={disabled || loading || showNoOptionsMessageAndDisable}
        {...restSelectProps}
      >
        {!hasUserOptions && noOptionsText !== undefined ? (
          <option value="" disabled>
            {noOptionsText}
          </option>
        ) : (
          finalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </Select>
      <FieldError error={error} />
    </FormControl>
  );
};

export const Form: React.FC<React.ComponentProps<"form">> & {
  Input: typeof Input;
  Select: typeof Select;
  Control: typeof FormControl;
  Label: typeof Label;
  Error: typeof FieldError;
  Textarea: typeof Textarea;
  FieldInput: React.FC<FieldInputProps>;
  FieldTextarea: React.FC<FieldTextareaProps>;
  FieldSelect: React.FC<FieldSelectProps>;
} = ({ children, className, onSubmit, ...props }) => {
  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSubmit?.(event);
      }}
      {...props}
    >
      {children}
    </form>
  );
};

Form.Input = Input;
Form.Select = Select;
Form.Control = FormControl;
Form.Label = Label;
Form.Error = FieldError;
Form.Textarea = Textarea;
Form.FieldInput = FieldInput;
Form.FieldTextarea = FieldTextarea;
Form.FieldSelect = FieldSelect;
