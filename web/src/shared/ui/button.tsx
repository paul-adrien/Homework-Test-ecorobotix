import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/shared/lib/cn.ts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
        secondary:
          "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] hover:bg-[var(--color-border-subtle)]",
        ghost: "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]",
        destructive: "bg-[var(--color-danger)] text-white hover:opacity-90",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
