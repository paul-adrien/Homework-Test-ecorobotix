/**
 * biome-ignore-all lint/a11y/useSemanticElements: a <button> cannot be a
 * <th> — the column header stays as a table cell and we expose the button
 * semantics via role + tabIndex + onKeyDown + aria-pressed.
 */
import type { DailyForecast } from "@agriwatch/shared";
import { Cloud, CloudDrizzle, CloudRain, type LucideIcon, Snowflake, Sun } from "lucide-react";
import { cn } from "@/shared/lib/cn.ts";
import { formatDayLabel } from "../../lib/format.ts";
import { type DayWeatherIcon, getDayWeatherIcon } from "../../lib/metric-thresholds.ts";

const DAY_ICON: Record<DayWeatherIcon, { Icon: LucideIcon; color: string }> = {
  snowflake: { Icon: Snowflake, color: "text-sky-500" },
  "cloud-rain": { Icon: CloudRain, color: "text-blue-500" },
  "cloud-drizzle": { Icon: CloudDrizzle, color: "text-sky-500" },
  sun: { Icon: Sun, color: "text-amber-500" },
  cloud: { Icon: Cloud, color: "text-slate-500" },
};

type DayHeaderProps = Readonly<{
  day: DailyForecast;
  isSelected: boolean;
  onSelect: (date: string) => void;
}>;

/**
 * Clickable column header in the transposed daily table. Shows the day
 * label + a weather hint icon (sun / cloud / rain / snowflake) coloured
 * to match the dominant condition. Selecting a column drives the hourly
 * drill-down below.
 *
 * Carries `data-date={day.date}` so the parent table can identify the
 * cell from a `querySelector` and scroll it into view (horizontally only)
 * when the selection is changed from outside the table — e.g. via the
 * hourly header's prev/next arrows.
 */
export function DayHeader({ day, isSelected, onSelect }: DayHeaderProps) {
  const { Icon, color: iconColor } = DAY_ICON[getDayWeatherIcon(day)];

  return (
    <th
      data-date={day.date}
      scope="col"
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onSelect(day.date)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(day.date);
        }
      }}
      className={cn(
        "min-w-[4rem] cursor-pointer whitespace-nowrap px-1 py-2.5 text-center text-xs outline-none transition-colors sm:min-w-[5rem] sm:px-2",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset",
        isSelected
          ? "bg-[var(--color-primary-light)] font-semibold text-[var(--color-text-primary)]"
          : "font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]",
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <span>{formatDayLabel(day.date)}</span>
        <Icon className={cn("size-5 shrink-0", iconColor)} aria-hidden="true" />
      </div>
    </th>
  );
}
