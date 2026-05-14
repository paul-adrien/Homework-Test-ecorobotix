import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/shared/lib/cn.ts";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:text-current [&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border-subtle)] bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]",
        info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/10 text-[var(--color-info)]",
        warning:
          "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
        destructive:
          "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  ),
);
Alert.displayName = "Alert";

export const AlertTitle = forwardRef<HTMLHeadingElement, ComponentProps<"h5">>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";
