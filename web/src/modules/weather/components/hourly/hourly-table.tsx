import type { HourlyForecast } from "@agriwatch/shared";
import { Droplet, ThermometerSun, Umbrella, Wind } from "lucide-react";
import { useMemo } from "react";
import { aggregateToSlices, type SliceHours } from "../../lib/slice-hourly.ts";
import { ColumnHeader } from "../shared/column-header.tsx";
import { HourlyRow } from "./hourly-row.tsx";

type HourlyTableProps = Readonly<{
  hourly: ReadonlyArray<HourlyForecast>;
  sliceHours: SliceHours;
}>;

/**
 * Hourly drill-down for the day picked in the daily summary. The hourly
 * forecast is aggregated into `24 / sliceHours` rows — temperature
 * averaged, precipitation summed, wind speed taken at peak, wind
 * direction snapped to the slice midpoint. Visual language mirrors the
 * daily table — same chip gradient per metric, same wind arrow — so the
 * agent's eye doesn't have to re-learn the colour scale when switching
 * tables.
 */
export function HourlyTable({ hourly, sliceHours }: HourlyTableProps) {
  const slices = useMemo(() => aggregateToSlices(hourly, sliceHours), [hourly, sliceHours]);

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead className="border-[var(--color-border-subtle)] border-b bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] text-xs">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-left font-medium">
              Time
            </th>
            <ColumnHeader icon={ThermometerSun} label="Temp" unit="°C" />
            <ColumnHeader icon={Umbrella} label="Precip" unit="mm" />
            <ColumnHeader icon={Wind} label="Wind" unit="km/h" />
            <ColumnHeader icon={Droplet} label="Humidity" unit="%" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {slices.map((slice) => (
            <HourlyRow key={slice.startHour} slice={slice} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
