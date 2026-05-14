import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/shared/lib/cn.ts";

/**
 * Minimal form field wrappers. Designed to compose with `react-hook-form` via
 * `<Controller>` or `register(...)`. Kept intentionally simple rather than
 * pulling in shadcn's full Form abstraction (which depends on react-hook-form
 * context); error rendering is done explicitly per form.
 */

export const FormField = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
  ),
);
FormField.displayName = "FormField";

export const FormError = forwardRef<HTMLParagraphElement, ComponentProps<"p">>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;
    return (
      <p
        ref={ref}
        role="alert"
        className={cn("text-sm text-[var(--color-danger)]", className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);
FormError.displayName = "FormError";
