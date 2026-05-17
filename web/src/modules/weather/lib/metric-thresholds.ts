import type { DailyForecast } from "@agriwatch/shared";

/**
 * Bucket tier — 1 (calmest end of the metric) to 4 (extreme end). Each
 * metric reads the tier scale differently — temperature 1 means cold, 4
 * means hot; precipitation 1 means dry, 4 means storm; humidity 1 means
 * dry, 4 means saturated.
 *
 * These tier helpers are kept primarily to document the agri thresholds
 * the UI's continuous chip styling builds on (see `getXxxChipStyle`
 * below) and to lock those bands in via the existing unit tests.
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
 * Continuous chip styling — one hue family per metric (two for the
 * diverging ones), opacity scales with how far the value sits from the
 * agri comfort zone. Replaces the previous discrete `tier × metric`
 * Tailwind matrix: each metric is now visually distinct at a glance
 * (orange = hot, blue = cold rain, slate = wind, amber/cyan = humidity
 * sides), and intensity reads as risk magnitude.
 *
 * The tier-band functions above are kept for documentation + tests, but
 * the UI uses the `getXxxChipStyle` helpers below.
 */

export type ChipStyle = Readonly<{
  /** Ready-to-render `rgba(r,g,b,a)` string. */
  backgroundColor: string;
  /** Foreground colour — switches to white past the contrast crossover. */
  color: string;
}>;

const COLOR_TEMP_COLD = "56, 189, 248"; // sky-400 — frost
const COLOR_TEMP_HOT = "249, 115, 22"; // orange-500 — heat
const COLOR_PRECIP = "37, 99, 235"; // blue-600 — rain volume
const COLOR_WIND = "71, 85, 105"; // slate-600 — wind speed
const COLOR_HUMIDITY_DRY = "245, 158, 11"; // amber-500 — dry / parched
const COLOR_HUMIDITY_HUMID = "8, 145, 178"; // cyan-600 — saturated / mildew

/** Below ~0.55 the dark text on the tinted fill still reads cleanly; at
 * or above that opacity the fill is dense enough that white text wins. */
const TEXT_CONTRAST_CROSSOVER = 0.55;
const TEXT_DARK = "rgb(15, 23, 42)"; // slate-900
const TEXT_LIGHT = "rgb(255, 255, 255)";

function lerp(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

function buildStyle(rgb: string, opacity: number): ChipStyle {
  return {
    backgroundColor: `rgba(${rgb}, ${opacity.toFixed(2)})`,
    color: opacity >= TEXT_CONTRAST_CROSSOVER ? TEXT_LIGHT : TEXT_DARK,
  };
}

/**
 * Daily temperature chip — picks the dominant side of the comfort zone.
 * Cold band starts at 0 °C (frost line); hot band starts at 20 °C with a
 * gentle slope out to 38 °C, so 21 °C and 25 °C feel like a smooth
 * progression rather than a binary "nothing → orange" jump at a sharp
 * threshold. When min dips below freezing AND max climbs into the heat
 * band (rare spring days), whichever distance from the zone is larger
 * wins. Returns `null` (no fill) when the day sits entirely within the
 * comfort band or no data is available.
 */
export function getDailyTempChipStyle(min: number | null, max: number | null): ChipStyle | null {
  if (min === null && max === null) return null;
  const coldDistance = min !== null && min < 0 ? -min : 0;
  const hotDistance = max !== null && max > 18 ? max - 18 : 0;
  if (coldDistance === 0 && hotDistance === 0) return null;
  if (coldDistance >= hotDistance) {
    // Cold scale: 0 °C → 0, -10 °C → 1.
    return buildStyle(COLOR_TEMP_COLD, lerp(coldDistance, 0, 10));
  }
  // Hot scale: 18 °C → 0, 42 °C → 1. The 24 °C span produces ~4 pp/°C,
  // so neighbouring days (e.g. 21 °C vs 25 °C) read as a gentle
  // gradient rather than a discrete colour jump — matches the actual
  // delta the eye sees in the numbers.
  return buildStyle(COLOR_TEMP_HOT, lerp(hotDistance, 0, 24));
}

/** Hourly temperature chip — same diverging logic as daily but on a
 * single value. */
export function getHourlyTempChipStyle(temp: number | null): ChipStyle | null {
  if (temp === null) return null;
  if (temp < 0) return buildStyle(COLOR_TEMP_COLD, lerp(-temp, 0, 10));
  if (temp > 18) return buildStyle(COLOR_TEMP_HOT, lerp(temp - 18, 0, 24));
  return null;
}

/**
 * Precipitation chip — single blue, opacity grows with cumulative rain.
 * Unlike the other metrics, rainfall *accumulates* over the window
 * (every other metric is a max or a mean), so the same number means
 * very different things at 1 h vs 24 h. We scale the "full intensity"
 * threshold by the window:
 *  - 1 h slice → 8 mm max (>8 mm in an hour = torrential / flash flood)
 *  - 3 h slice → 15 mm max (heavy convective burst)
 *  - 24 h daily → 25 mm max (wet day blocking field work)
 *
 * The ramp starts at the first drop because any rain is a decision
 * signal — spraying / harvesting / pruning all sit on a dry-or-not
 * check.
 */
const PRECIP_MAX_BY_WINDOW: Record<1 | 3 | 24, number> = {
  1: 8,
  3: 15,
  24: 25,
};

export function getPrecipChipStyle(
  mm: number | null,
  windowHours: 1 | 3 | 24 = 24,
): ChipStyle | null {
  if (mm === null || mm <= 0) return null;
  return buildStyle(COLOR_PRECIP, lerp(mm, 0, PRECIP_MAX_BY_WINDOW[windowHours]));
}

/** Wind chip — single slate, opacity ramps from the breezy threshold
 * (15 km/h, end of "comfortable") to the equipment-hazard ceiling
 * (45 km/h). Under 15 km/h returns no fill — that's the calm zone where
 * field work isn't affected. */
export function getWindChipStyle(kmh: number | null): ChipStyle | null {
  if (kmh === null || kmh <= 15) return null;
  return buildStyle(COLOR_WIND, lerp(kmh - 15, 0, 30));
}

/**
 * Humidity chip — diverging like temperature because both ends of the
 * range are agri-relevant: amber for dry (<40 % parches crops), cyan
 * for humid (>75 % mildew-friendly, >90 % saturated). The 40–75 %
 * comfort band returns `null` (no fill).
 */
export function getHumidityChipStyle(pct: number | null): ChipStyle | null {
  if (pct === null) return null;
  if (pct < 40) {
    // Dry scale: 40 % → 0, 15 % → 1.
    return buildStyle(COLOR_HUMIDITY_DRY, lerp(40 - pct, 0, 25));
  }
  if (pct > 75) {
    // Humid scale: 75 % → 0, 95 % → 1.
    return buildStyle(COLOR_HUMIDITY_HUMID, lerp(pct - 75, 0, 20));
  }
  return null;
}

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
