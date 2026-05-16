/**
 * biome-ignore-all lint/a11y/useSemanticElements: this option is one of two
 * in a segmented control — `role="radio"` on `<button>` with aria-checked is
 * the canonical ARIA pattern; native `<input type="radio">` would mean extra
 * wrapping markup for no real a11y win.
 */
import { cn } from "@/shared/lib/cn.ts";
import type { SliceHours } from "../../lib/slice-hourly.ts";

type GranularityOptionProps = Readonly<{
  value: SliceHours;
  current: SliceHours;
  label: string;
  onSelect: (hours: SliceHours) => void;
}>;

/**
 * One button inside the granularity segmented control. The active option
 * gets a primary-light fill; the inactive one stays text-only with a
 * hover affordance.
 */
export function GranularityOption({ value, current, label, onSelect }: GranularityOptionProps) {
  const isActive = value === current;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={() => onSelect(value)}
      className={cn(
        "min-w-[2rem] rounded px-1.5 py-0.5 font-medium text-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        isActive
          ? "bg-[var(--color-primary-light)] text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]",
      )}
    >
      {label}
    </button>
  );
}
