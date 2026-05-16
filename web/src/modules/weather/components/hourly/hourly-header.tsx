import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDayLabel } from "../../lib/format.ts";
import type { SliceHours } from "../../lib/slice-hourly.ts";
import { GranularityToggle } from "./granularity-toggle.tsx";
import { NavButton } from "./nav-button.tsx";

type HourlyHeaderProps = Readonly<{
  selectedDate: string;
  /** Ordered list of available dates (matches the daily summary order). */
  availableDates: ReadonlyArray<string>;
  onSelectDate: (date: string) => void;
  sliceHours: SliceHours;
  onChangeSliceHours: (hours: SliceHours) => void;
}>;

/**
 * Card sat between the daily summary and the hourly drill-down. Centres
 * the day label, with the prev day arrow flush left and the slice
 * granularity toggle + next day arrow flush right (3-column grid). The
 * toggle stays in the same line as the label so it doesn't steal any
 * vertical space from the tables.
 */
export function HourlyHeader({
  selectedDate,
  availableDates,
  onSelectDate,
  sliceHours,
  onChangeSliceHours,
}: HourlyHeaderProps) {
  const currentIndex = availableDates.indexOf(selectedDate);
  const prevDate = currentIndex > 0 ? availableDates[currentIndex - 1] : null;
  const nextDate =
    currentIndex >= 0 && currentIndex < availableDates.length - 1
      ? availableDates[currentIndex + 1]
      : null;

  return (
    <div className="grid grid-cols-3 items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2">
      <div className="justify-self-start">
        <NavButton
          label="Previous day"
          icon={<ChevronLeft className="size-4" aria-hidden="true" />}
          onClick={() => (prevDate ? onSelectDate(prevDate) : null)}
          disabled={prevDate === null}
        />
      </div>
      <span className="text-center font-semibold text-[var(--color-text-primary)] text-sm">
        {formatDayLabel(selectedDate)}
      </span>
      <div className="flex items-center justify-end gap-2">
        <GranularityToggle value={sliceHours} onChange={onChangeSliceHours} />
        <NavButton
          label="Next day"
          icon={<ChevronRight className="size-4" aria-hidden="true" />}
          onClick={() => (nextDate ? onSelectDate(nextDate) : null)}
          disabled={nextDate === null}
        />
      </div>
    </div>
  );
}
