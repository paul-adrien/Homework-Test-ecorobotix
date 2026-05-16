import { formatNumber } from "../../lib/format.ts";
import {
  getHumidityTier,
  getPrecipTier,
  getTempTier,
  getWindTier,
} from "../../lib/metric-thresholds.ts";
import type { HourSlice } from "../../lib/slice-hourly.ts";
import { ChipCell } from "../shared/chip-cell.tsx";
import { WindArrow } from "../shared/wind-arrow.tsx";

type HourlyRowProps = Readonly<{ slice: HourSlice }>;

/**
 * One row of the hourly drill-down table: the slice's start hour as a row
 * header, then a `<ChipCell>` per metric. Same chip gradient as the daily
 * table so the visual scale carries over.
 */
export function HourlyRow({ slice }: HourlyRowProps) {
  const tempTier = getTempTier(slice.temperatureMean, slice.temperatureMean);
  const precipTier = getPrecipTier(slice.precipitationSum);
  const windTier = getWindTier(slice.windSpeedMax);
  const humidityTier = getHumidityTier(slice.humidityMean);

  return (
    <tr>
      <th
        scope="row"
        className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-[var(--color-text-primary)]"
      >
        {slice.label}
      </th>
      <ChipCell metric="temp" tier={tempTier}>
        {formatNumber(slice.temperatureMean)}
      </ChipCell>
      <ChipCell metric="precip" tier={precipTier}>
        {formatNumber(slice.precipitationSum, 1)}
      </ChipCell>
      <ChipCell metric="wind" tier={windTier}>
        <span className="inline-flex items-center gap-1">
          {formatNumber(slice.windSpeedMax)}
          {slice.windDirectionMid === null ? null : (
            <WindArrow direction={slice.windDirectionMid} />
          )}
        </span>
      </ChipCell>
      <ChipCell metric="humidity" tier={humidityTier}>
        {formatNumber(slice.humidityMean)}
      </ChipCell>
    </tr>
  );
}
