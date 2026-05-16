import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Metric, Tier } from "../../lib/metric-thresholds.ts";
import { ChipCell } from "../shared/chip-cell.tsx";

export type DailyCellDescriptor = Readonly<{
  date: string;
  tier: Tier | null;
  content: ReactNode;
}>;

type MetricRowProps = Readonly<{
  icon: LucideIcon;
  label: string;
  unit: string;
  cells: ReadonlyArray<DailyCellDescriptor>;
  metric: Metric;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}>;

/**
 * One row of the transposed daily table — the metric label sits in a
 * sticky left column (icon + label + unit, collapsed to icon-only on
 * mobile), then one `<ChipCell>` per day. Each cell is clickable so the
 * whole column acts as a day selector, not just the header.
 */
export function MetricRow({
  icon: Icon,
  label,
  unit,
  cells,
  metric,
  selectedDate,
  onSelectDate,
}: MetricRowProps) {
  return (
    <tr>
      <th
        scope="row"
        className="sticky left-0 z-10 min-w-[3rem] border-[var(--color-border-subtle)] border-r bg-[var(--color-surface-alt)] px-1 py-2 text-center font-medium text-[var(--color-text-secondary)] text-xs sm:min-w-[7rem] sm:px-3 sm:text-left"
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {/* `sr-only` on mobile keeps the metric name accessible to screen
              readers even when the visible column collapses to icon-only —
              otherwise the `<th scope="row">` would have an empty
              accessible name and the table would be unreadable for
              non-sighted agents. */}
          <span className="sr-only sm:not-sr-only">{label}</span>
          <span className="hidden font-normal text-[10px] text-[var(--color-text-muted)] sm:inline">
            ({unit})
          </span>
        </span>
      </th>
      {cells.map((cell) => (
        <ChipCell
          key={cell.date}
          metric={metric}
          tier={cell.tier}
          onClick={() => onSelectDate(cell.date)}
          tdClassName={cell.date === selectedDate ? "bg-[var(--color-primary-light)]/40" : ""}
        >
          {cell.content}
        </ChipCell>
      ))}
    </tr>
  );
}
