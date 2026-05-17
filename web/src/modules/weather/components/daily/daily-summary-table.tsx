import type { DailyForecast } from "@agriwatch/shared";
import { Droplet, ThermometerSun, Umbrella, Wind } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTemperatureUnit } from "@/modules/preferences/hooks/use-temperature-unit.ts";
import { formatNumber } from "../../lib/format.ts";
import {
  getDailyTempChipStyle,
  getHumidityChipStyle,
  getPrecipChipStyle,
  getWindChipStyle,
} from "../../lib/metric-thresholds.ts";
import { WindArrow } from "../shared/wind-arrow.tsx";
import { DayHeader } from "./day-header.tsx";
import { MetricRow } from "./metric-row.tsx";

type DailySummaryTableProps = Readonly<{
  daily: ReadonlyArray<DailyForecast>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}>;

/**
 * Transposed multi-day summary: days run across as columns, the four
 * decision-driving metrics (temp / precip / wind / humidity) stack as
 * rows. Each cell carries a coloured chip graduated per metric — the
 * agent reads risk by hue, scanning columns.
 *
 * Why transposed rather than 1-row-per-day:
 *  - On mobile, horizontal scroll happens on the table only (the page
 *    keeps scrolling vertically), so the agent can swipe through 14+
 *    days without the table eating the whole screen.
 *  - Picking a day for the hourly drill-down stays a tap on any cell of
 *    the day's column — always near the top of the viewport, no
 *    back-and-forth.
 *  - The metric labels live in a sticky first column so they stay
 *    visible even when scrolled horizontally on narrow screens.
 */
export function DailySummaryTable({ daily, selectedDate, onSelectDate }: DailySummaryTableProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { symbol: tempSymbol, formatTempRange } = useTemperatureUnit();

  // Keep the selected day-column visible inside the table's own horizontal
  // scroller, without ever touching the page's vertical scroll. The browser's
  // built-in `scrollIntoView` would otherwise snap the whole page upward on
  // mobile when the daily table is above the viewport — we side-step that by
  // moving only `scrollLeft` on the wrapper element.
  useEffect(() => {
    if (selectedDate === null || wrapperRef.current === null) return;
    const wrapper = wrapperRef.current;
    const target = wrapper.querySelector<HTMLElement>(`[data-date="${selectedDate}"]`);
    if (!target) return;

    const visibleStart = wrapper.scrollLeft;
    const visibleEnd = visibleStart + wrapper.clientWidth;
    const targetStart = target.offsetLeft;
    const targetEnd = targetStart + target.offsetWidth;

    if (targetStart < visibleStart) {
      wrapper.scrollTo({ left: targetStart, behavior: "smooth" });
    } else if (targetEnd > visibleEnd) {
      wrapper.scrollTo({ left: targetEnd - wrapper.clientWidth, behavior: "smooth" });
    }
  }, [selectedDate]);

  return (
    <div
      ref={wrapperRef}
      className="overflow-x-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-[var(--color-border-subtle)] border-b">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[3rem] border-[var(--color-border-subtle)] border-r bg-[var(--color-surface-alt)] px-1 py-2 sm:min-w-[7rem] sm:px-3"
            />
            {daily.map((day) => (
              <DayHeader
                key={day.date}
                day={day}
                isSelected={day.date === selectedDate}
                onSelect={onSelectDate}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          <MetricRow
            icon={ThermometerSun}
            label="Temp"
            unit={tempSymbol}
            cells={daily.map((day) => ({
              date: day.date,
              style: getDailyTempChipStyle(day.temperatureMin, day.temperatureMax),
              content: formatTempRange(day.temperatureMin, day.temperatureMax),
            }))}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
          <MetricRow
            icon={Umbrella}
            label="Precip"
            unit="mm"
            cells={daily.map((day) => ({
              date: day.date,
              style: getPrecipChipStyle(day.precipitationSum),
              content: formatNumber(day.precipitationSum, 1),
            }))}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
          <MetricRow
            icon={Wind}
            label="Wind"
            unit="km/h"
            cells={daily.map((day) => ({
              date: day.date,
              style: getWindChipStyle(day.windSpeedMax),
              content: (
                <span className="inline-flex items-center gap-1">
                  {formatNumber(day.windSpeedMax)}
                  {day.windDirectionDominant === null ? null : (
                    <WindArrow direction={day.windDirectionDominant} />
                  )}
                </span>
              ),
            }))}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
          <MetricRow
            icon={Droplet}
            label="Humidity"
            unit="%"
            cells={daily.map((day) => ({
              date: day.date,
              style: getHumidityChipStyle(day.humidityMean),
              content: formatNumber(day.humidityMean),
            }))}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
        </tbody>
      </table>
    </div>
  );
}
