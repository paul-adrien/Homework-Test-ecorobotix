import type { HourlyForecast } from "@agriwatch/shared";

/** Slice granularities the UI offers — 1-hour shows every hourly entry
 * (24 rows); 3-hour aggregates into 8 broader windows. */
export type SliceHours = 1 | 3;

export type HourSlice = Readonly<{
  /** Inclusive start hour (UTC), 0 / 3 / 6 / ... / 21. */
  startHour: number;
  /** "00", "03", "06", ..., "21" — the first hour of the slice (the next
   * slice's start hour implies the end). */
  label: string;
  temperatureMean: number | null;
  precipitationSum: number | null;
  precipitationProbabilityMax: number | null;
  windSpeedMax: number | null;
  /** Direction at the middle of the slice (closest hourly entry), in degrees. */
  windDirectionMid: number | null;
  humidityMean: number | null;
}>;

/**
 * Aggregate an hourly forecast into N slices of `sliceHours` hours each.
 * With `sliceHours = 3` the day breaks into 8 windows (default); with
 * `sliceHours = 1` every hour gets its own row (24 windows total). Per
 * metric:
 *  - temperature  → mean (small intra-slice variation, mean is honest).
 *  - precipitation → sum (cumulative rain matters more than max).
 *  - probability  → max (a 100%-rain hour in the middle of the slice is
 *    the signal, not the average).
 *  - wind speed   → max (peak gust drives the spraying decision).
 *  - wind direction → entry closest to the middle of the slice (skipping
 *    the circular mean that would require trig).
 *  - humidity     → mean.
 *
 * Empty slices (no hourly entry within range) are still emitted with all
 * metrics null, so the table renders a consistent N rows even on sparse
 * upstream data (e.g. Yr.no's longer-range 6h entries beyond day 2).
 */
export function aggregateToSlices(
  hourly: ReadonlyArray<HourlyForecast>,
  sliceHours: SliceHours = 3,
): HourSlice[] {
  const slicesPerDay = 24 / sliceHours;
  const slices: HourSlice[] = [];

  for (let i = 0; i < slicesPerDay; i += 1) {
    const startHour = i * sliceHours;
    const endHour = startHour + sliceHours;
    const entries = hourly.filter((entry) => {
      const hour = parseHourUtc(entry.time);
      return hour !== null && hour >= startHour && hour < endHour;
    });

    slices.push({
      startHour,
      label: `${formatHour(startHour)} h`,
      temperatureMean: meanOrNull(entries.map((e) => e.temperature)),
      precipitationSum: sumOrNull(entries.map((e) => e.precipitation)),
      precipitationProbabilityMax: maxOrNull(entries.map((e) => e.precipitationProbability)),
      windSpeedMax: maxOrNull(entries.map((e) => e.windSpeed)),
      windDirectionMid: pickMiddleDirection(entries, startHour + sliceHours / 2),
      humidityMean: meanOrNull(entries.map((e) => e.humidity)),
    });
  }

  return slices;
}

function parseHourUtc(iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCHours();
}

function formatHour(hour: number): string {
  return String(hour).padStart(2, "0");
}

function pickMiddleDirection(
  entries: ReadonlyArray<HourlyForecast>,
  targetHour: number,
): number | null {
  let best: { direction: number; distance: number } | null = null;
  for (const entry of entries) {
    if (entry.windDirection === null) continue;
    const entryHour = parseHourUtc(entry.time);
    if (entryHour === null) continue;
    const distance = Math.abs(entryHour - targetHour);
    if (best === null || distance < best.distance) {
      best = { direction: entry.windDirection, distance };
    }
  }
  return best?.direction ?? null;
}

function meanOrNull(values: ReadonlyArray<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((acc, v) => acc + v, 0) / present.length;
}

function sumOrNull(values: ReadonlyArray<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((acc, v) => acc + v, 0);
}

function maxOrNull(values: ReadonlyArray<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return Math.max(...present);
}
