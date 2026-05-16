/**
 * biome-ignore-all lint/a11y/useKeyWithClickEvents: the optional `onClick`
 * is a mouse/touch enhancement — the keyboard path lives on the column or
 * row header that wraps these cells (DayHeader carries role=button +
 * tabIndex + onKeyDown). Making every td its own tab stop would add
 * dozens of redundant focus targets without improving access.
 */
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn.ts";
import { CHIP_CLASS, CHIP_NEUTRAL, type Metric, type Tier } from "../../lib/metric-thresholds.ts";

type ChipCellProps = Readonly<{
  metric: Metric;
  tier: Tier | null;
  children: ReactNode;
  /** Optional click handler — when present the `<td>` becomes a click
   * target. Used by the daily table to make the whole column clickable. */
  onClick?: () => void;
  /** Extra class applied to the surrounding `<td>` (e.g. selected-column
   * tint, hover, etc.). */
  tdClassName?: string;
}>;

/**
 * `<td>` + chip wrapper used by both the daily and hourly tables — pulls
 * its background colour from `CHIP_CLASS[metric][tier]` so the same
 * visual scale stretches across both views. The chip fills the cell
 * width minus padding so wider columns on desktop don't leave large
 * white gutters between chips.
 */
export function ChipCell({ metric, tier, children, onClick, tdClassName }: ChipCellProps) {
  const chipClass = tier === null ? CHIP_NEUTRAL : CHIP_CLASS[metric][tier];
  return (
    <td
      onClick={onClick}
      className={cn("px-1 py-2 text-center sm:px-2", onClick ? "cursor-pointer" : "", tdClassName)}
    >
      <span
        className={cn(
          "flex w-full items-center justify-center whitespace-nowrap rounded-md px-1.5 py-1 font-mono text-sm tabular-nums sm:px-2",
          chipClass,
        )}
      >
        {children}
      </span>
    </td>
  );
}
