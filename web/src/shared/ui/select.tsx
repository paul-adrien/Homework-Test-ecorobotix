import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/shared/lib/cn.ts";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm",
      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
      "hover:bg-[var(--color-surface-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[placeholder]:text-[var(--color-text-muted)]",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={4}
      className={cn(
        "relative z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-lg",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectLabel = forwardRef<HTMLDivElement, ComponentProps<typeof SelectPrimitive.Label>>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Label
      ref={ref}
      className={cn(
        "px-2 py-1.5 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide",
        className,
      )}
      {...props}
    />
  ),
);
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export const SelectItem = forwardRef<HTMLDivElement, ComponentProps<typeof SelectPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none",
        "focus:bg-[var(--color-primary-light)] focus:text-[var(--color-text-primary)]",
        "data-[state=checked]:font-medium",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

export const SelectSeparator = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[var(--color-border-subtle)]", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
