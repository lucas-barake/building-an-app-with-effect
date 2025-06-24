import { cn } from "@/lib/utils/cn";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as Duration from "effect/Duration";
import { type DurationInput } from "effect/Duration";
import * as React from "react";

const TooltipProvider = TooltipPrimitive.Provider;

const TooltipRoot = ({
  delayDuration = "300 millis",
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>, "delayDuration"> & {
  delayDuration?: DurationInput;
}) => <TooltipPrimitive.Root {...props} delayDuration={Duration.toMillis(delayDuration)} />;
TooltipRoot.displayName = TooltipPrimitive.Root.displayName;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

type TooltipComponentType = {
  Trigger: typeof TooltipTrigger;
  Content: typeof TooltipContent;
} & React.FC<React.ComponentPropsWithoutRef<typeof TooltipRoot>>;

export const Tooltip: TooltipComponentType = ({ children, ...props }) => (
  <TooltipProvider>
    <TooltipRoot {...props}>{children}</TooltipRoot>
  </TooltipProvider>
);
Tooltip.Trigger = TooltipTrigger;
Tooltip.Content = TooltipContent;
