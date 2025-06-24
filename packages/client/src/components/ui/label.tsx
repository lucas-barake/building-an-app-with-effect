import { cn } from "@/lib/utils/cn";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

const Label = ({
  className,
  required = false,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  required?: boolean;
}) => {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {props.children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </LabelPrimitive.Root>
  );
};

export { Label };
