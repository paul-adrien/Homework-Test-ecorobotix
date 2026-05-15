import { type ComponentProps, forwardRef } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/shared/lib/cn.ts";

export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerPortal = DrawerPrimitive.Portal;
export const DrawerClose = DrawerPrimitive.Close;

export const DrawerOverlay = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-[var(--color-dark-navy)]/60 backdrop-blur-sm", className)}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

type DrawerContentProps = ComponentProps<typeof DrawerPrimitive.Content>;

/**
 * Bottom-sheet container for vaul Drawers. Renders the rounded-top sheet
 * with a small drag handle, an overlay behind it, and our brand-surface
 * styling. Pulled up to ~90vh by default to leave a peek of context above.
 */
export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, children, ...props }, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-xl border-[var(--color-border-subtle)] border-t bg-[var(--color-surface)]",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-[var(--color-border-subtle)]"
        />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  ),
);
DrawerContent.displayName = "DrawerContent";

export function DrawerHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-5 pt-3 pb-2 text-left", className)} {...props} />
  );
}

export function DrawerBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1 overflow-y-auto px-5 pb-5", className)} {...props} />;
}

export const DrawerTitle = forwardRef<
  HTMLHeadingElement,
  ComponentProps<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "font-semibold text-[var(--color-text-primary)] text-lg leading-tight",
      className,
    )}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

export const DrawerDescription = forwardRef<
  HTMLParagraphElement,
  ComponentProps<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-[var(--color-text-secondary)] text-sm", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";
