import type { TemperatureUnit } from "@agriwatch/shared";
import { useCallback, useMemo } from "react";
import { formatNumber } from "@/modules/weather/lib/format.ts";
import { usePreferences } from "./use-preferences.ts";

/**
 * Conversion table — temperatures upstream are always returned in Celsius
 * (Open-Meteo `temperature_unit=celsius` is the default, Yr.no exposes
 * Celsius too). The frontend converts at display time so the same cached
 * blob serves both unit preferences without re-fetching.
 */
function celsiusTo(value: number, unit: TemperatureUnit): number {
  if (unit === "fahrenheit") return value * (9 / 5) + 32;
  return value;
}

export type TemperatureUnitTools = Readonly<{
  unit: TemperatureUnit;
  /** Short label for table headers — "°C" / "°F". */
  symbol: string;
  /** Convert + format a single Celsius value; `null` → em-dash. */
  formatTemp: (celsius: number | null, decimals?: number) => string;
  /** Convert + format a Celsius min/max pair as a compact "12/22" string. */
  formatTempRange: (min: number | null, max: number | null) => string;
}>;

/**
 * Reads the user's preferred temperature unit and returns memoised
 * formatters that apply it. Components in the forecast tables consume this
 * directly instead of importing the raw format helpers, so flipping the
 * unit in Settings instantly re-renders every temperature on screen via
 * the TanStack Query cache update.
 *
 * Falls back to Celsius while preferences haven't loaded — matches the
 * Prisma column default, so the first render is consistent with the value
 * the backend would return.
 */
export function useTemperatureUnit(): TemperatureUnitTools {
  const { data } = usePreferences();
  const unit: TemperatureUnit = data?.temperatureUnit ?? "celsius";

  const formatTemp = useCallback(
    (celsius: number | null, decimals = 0) =>
      celsius === null ? formatNumber(null) : formatNumber(celsiusTo(celsius, unit), decimals),
    [unit],
  );

  const formatTempRange = useCallback(
    (min: number | null, max: number | null) => {
      if (min === null && max === null) return formatNumber(null);
      const minOut = min === null ? null : celsiusTo(min, unit);
      const maxOut = max === null ? null : celsiusTo(max, unit);
      return `${formatNumber(minOut)}/${formatNumber(maxOut)}`;
    },
    [unit],
  );

  return useMemo(
    () => ({
      unit,
      symbol: unit === "fahrenheit" ? "°F" : "°C",
      formatTemp,
      formatTempRange,
    }),
    [unit, formatTemp, formatTempRange],
  );
}
