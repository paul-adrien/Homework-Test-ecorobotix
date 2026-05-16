import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn.ts";

type NavButtonProps = Readonly<{
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
}>;

/**
 * Square icon button used as prev/next day controls in the hourly header.
 * `shrink-0` prevents the button from being squeezed by flex/grid layout
 * neighbours (the granularity toggle in particular).
 */
export function NavButton({ label, icon, onClick, disabled }: NavButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-subtle)] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        disabled
          ? "cursor-not-allowed text-[var(--color-text-muted)] opacity-50"
          : "cursor-pointer text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]",
      )}
    >
      {icon}
    </button>
  );
}
