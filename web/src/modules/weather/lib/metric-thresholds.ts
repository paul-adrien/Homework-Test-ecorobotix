import type { DailyForecast } from "@agriwatch/shared";

/**
 * Bucket tier — 1 (calmest end of the metric) to 4 (extreme end). Each
 * metric reads the tier scale differently — temperature 1 means cold, 4
 * means hot; precipitation 1 means dry, 4 means storm; humidity 1 means
 * dry, 4 means saturated. The semantics are encoded by the colour
 * gradient in `CHIP_CLASS` so the agent reads risk by hue, not by tier
 * number.
 *
 * Thresholds chosen around agri-relevant decisions:
 *  - Temp: frost (<0°C) forces tier 1 regardless of the day's max;
 *    sustained > 32°C (heat stress) forces tier 4 regardless of min.
 *  - Precip: 1mm = light, 10mm = wet, 20mm+ = field work blocked.
 *  - Wind: 15 km/h = comfortable, 25 km/h = phyto spraying limit,
 *    40 km/h+ = equipment hazard.
 *  - Humidity: < 40% dries crops, > 75% mildew-friendly, > 90% saturated.
 */
export type Tier = 1 | 2 | 3 | 4;
export type Metric = "temp" | "precip" | "wind" | "humidity";

export function getTempTier(min: number | null, max: number | null): Tier | null {
  if (max === null && min === null) return null;
  if (min !== null && min < 0) return 1;
  if (max !== null) {
    if (max >= 32) return 4;
    if (max >= 25) return 3;
    if (max >= 15) return 2;
  }
  return 1;
}

export function getPrecipTier(amountMm: number | null): Tier | null {
  if (amountMm === null) return null;
  if (amountMm >= 20) return 4;
  if (amountMm >= 10) return 3;
  if (amountMm >= 1) return 2;
  return 1;
}

export function getWindTier(kmh: number | null): Tier | null {
  if (kmh === null) return null;
  if (kmh >= 40) return 4;
  if (kmh >= 25) return 3;
  if (kmh >= 15) return 2;
  return 1;
}

export function getHumidityTier(pct: number | null): Tier | null {
  if (pct === null) return null;
  if (pct >= 90) return 4;
  if (pct >= 75) return 3;
  if (pct >= 40) return 2;
  return 1;
}

/**
 * Tailwind classes (bg + text) for each `(metric, tier)` pair. Each metric
 * walks its own gradient from "calm" to "extreme" — temperature climbs
 * cool-blue → green → amber → red; precipitation climbs neutral grey →
 * cyan → blue → indigo; wind climbs grey → amber → orange → red;
 * humidity climbs dry-amber → green → violet → deep violet.
 *
 * `null` (missing data) yields a neutral grey chip — explicit "no signal"
 * is better than a cell that quietly disappears.
 */
export const CHIP_CLASS: Record<Metric, Record<Tier, string>> = {
  temp: {
    1: "bg-sky-100 text-sky-900",
    2: "bg-emerald-100 text-emerald-900",
    3: "bg-amber-100 text-amber-900",
    4: "bg-red-200 text-red-950",
  },
  precip: {
    1: "bg-slate-100 text-slate-700",
    2: "bg-sky-100 text-sky-900",
    3: "bg-blue-200 text-blue-950",
    4: "bg-indigo-300 text-indigo-950",
  },
  wind: {
    1: "bg-slate-100 text-slate-700",
    2: "bg-amber-100 text-amber-900",
    3: "bg-orange-200 text-orange-950",
    4: "bg-red-200 text-red-950",
  },
  humidity: {
    1: "bg-amber-100 text-amber-900",
    2: "bg-emerald-100 text-emerald-900",
    3: "bg-violet-200 text-violet-900",
    4: "bg-violet-400 text-white",
  },
};

export const CHIP_NEUTRAL = "bg-slate-50 text-slate-400";

/**
 * Names of the lucide-react icons used to convey the dominant condition
 * of a day at a glance. Returned as a string identifier rather than the
 * icon component itself so the threshold module stays free of UI deps.
 */
export type DayWeatherIcon = "snowflake" | "cloud-rain" | "cloud-drizzle" | "sun" | "cloud";

export function getDayWeatherIcon(day: DailyForecast): DayWeatherIcon {
  const precip = day.precipitationSum ?? 0;
  const prob = day.precipitationProbabilityMax ?? 0;
  if (day.temperatureMin !== null && day.temperatureMin < 0) return "snowflake";
  if (precip >= 5) return "cloud-rain";
  if (precip >= 1 || prob >= 50) return "cloud-drizzle";
  if (day.temperatureMax !== null && day.temperatureMax >= 25) return "sun";
  return "cloud";
}
