import { cn } from "@/lib/utils/cn";
import { cva } from "class-variance-authority";
import * as React from "react";

const textareaVariants = cva(
  "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

const Textarea: React.FC<React.ComponentProps<"textarea">> & {
  variants: typeof textareaVariants;
} = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        textareaVariants({
          className,
        }),
        className,
      )}
      {...props}
    />
  );
};
Textarea.displayName = "Textarea";
Textarea.variants = textareaVariants;

export { Textarea };
