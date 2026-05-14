import * as LabelPrimitive from "@radix-ui/react-label";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/shared/lib/cn.ts";

export const Label = forwardRef<HTMLLabelElement, ComponentProps<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "text-sm font-medium text-[var(--color-text-primary)] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = LabelPrimitive.Root.displayName;
