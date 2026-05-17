import { useTemperatureUnit } from "@/modules/preferences/hooks/use-temperature-unit.ts";
import { formatNumber } from "../../lib/format.ts";
import {
  getHourlyTempChipStyle,
  getHumidityChipStyle,
  getPrecipChipStyle,
  getWindChipStyle,
} from "../../lib/metric-thresholds.ts";
import type { HourSlice, SliceHours } from "../../lib/slice-hourly.ts";
import { ChipCell } from "../shared/chip-cell.tsx";
import { WindArrow } from "../shared/wind-arrow.tsx";

type HourlyRowProps = Readonly<{
  slice: HourSlice;
  sliceHours: SliceHours;
}>;

/**
 * One row of the hourly drill-down table: the slice's start hour as a row
 * header, then a `<ChipCell>` per metric. Same chip language as the daily
 * table — each metric gets its own hue (orange/blue for temp, blue for
 * precip, slate for wind, amber/cyan for humidity) with opacity scaling
 * by risk magnitude. Temperatures are converted at display time to the
 * user's preferred unit via `useTemperatureUnit`; the chip colour still
 * uses the raw Celsius value so the visual scale stays consistent
 * across units (frost-blue at < 0 °C / 32 °F is the same chip).
 */
export function HourlyRow({ slice, sliceHours }: HourlyRowProps) {
  const { formatTemp } = useTemperatureUnit();

  return (
    <tr>
      <th
        scope="row"
        className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-[var(--color-text-primary)]"
      >
        {slice.label}
      </th>
      <ChipCell style={getHourlyTempChipStyle(slice.temperatureMean)}>
        {formatTemp(slice.temperatureMean)}
      </ChipCell>
      <ChipCell style={getPrecipChipStyle(slice.precipitationSum, sliceHours)}>
        {formatNumber(slice.precipitationSum, 1)}
      </ChipCell>
      <ChipCell style={getWindChipStyle(slice.windSpeedMax)}>
        <span className="inline-flex items-center gap-1">
          {formatNumber(slice.windSpeedMax)}
          {slice.windDirectionMid === null ? null : (
            <WindArrow direction={slice.windDirectionMid} />
          )}
        </span>
      </ChipCell>
      <ChipCell style={getHumidityChipStyle(slice.humidityMean)}>
        {formatNumber(slice.humidityMean)}
      </ChipCell>
    </tr>
  );
}
