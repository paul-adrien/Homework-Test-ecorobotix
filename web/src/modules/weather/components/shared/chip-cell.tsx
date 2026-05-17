/**
 * biome-ignore-all lint/a11y/useKeyWithClickEvents: the optional `onClick`
 * is a mouse/touch enhancement — the keyboard path lives on the column or
 * row header that wraps these cells (DayHeader carries role=button +
 * tabIndex + onKeyDown). Making every td its own tab stop would add
 * dozens of redundant focus targets without improving access.
 */
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn.ts";
import type { ChipStyle } from "../../lib/metric-thresholds.ts";

type ChipCellProps = Readonly<{
  /** Inline style spec for the chip — `null` means "no signal" and the
   * chip renders in a neutral muted fill (so the cell still looks like
   * a chip rather than vanishing into the row). */
  style: ChipStyle | null;
  children: ReactNode;
  /** Optional click handler — when present the `<td>` becomes a click
   * target. Used by the daily table to make the whole column clickable. */
  onClick?: () => void;
  /** Extra class applied to the surrounding `<td>` (e.g. selected-column
   * tint, hover, etc.). */
  tdClassName?: string;
}>;

/**
 * `<td>` + chip wrapper used by both the daily and hourly tables. The
 * background colour is an inline `rgba()` computed continuously from
 * the metric value (see `getXxxChipStyle` in `lib/metric-thresholds`),
 * so intensity scales smoothly with risk magnitude rather than stepping
 * between four discrete tiers. Each metric uses its own hue family,
 * which lets the agent identify the column/row at a glance.
 */
export function ChipCell({ style, children, onClick, tdClassName }: ChipCellProps) {
  return (
    <td
      onClick={onClick}
      className={cn("px-1 py-2 text-center sm:px-2", onClick ? "cursor-pointer" : "", tdClassName)}
    >
      <span
        style={
          style === null
            ? undefined
            : { backgroundColor: style.backgroundColor, color: style.color }
        }
        className={cn(
          "flex w-full items-center justify-center whitespace-nowrap rounded-md px-1.5 py-1 font-mono text-sm tabular-nums sm:px-2",
          style === null && "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]",
        )}
      >
        {children}
      </span>
    </td>
  );
}
