import type { CurrentWeather, DailyForecast, HourlyForecast } from "@agriwatch/shared";
import { LRUCache } from "lru-cache";
import { WeatherProviderFetchFailed } from "../domain/weather.errors.ts";
import type { WeatherProvider } from "../ports/weather-provider.ts";

const BASE_URL = "https://api.met.no/weatherapi/locationforecast/2.0/complete";

// Met.no's TOS require a User-Agent identifying the app + a contact URL —
// the default-Node/fetch UA gets blocked. See
// https://api.met.no/doc/TermsOfService.
const USER_AGENT = "AgriWatch/0.1.0 (https://github.com/paul-adrien/Homework-Test-ecorobotix)";

// Safety-net TTL when the upstream omits `Expires`. Met.no normally sets it
// roughly hourly, so this should never actually fire — but better a short
// fallback than an unbounded cache entry.
const FALLBACK_EXPIRY_MS = 15 * 60 * 1000;

const MAX_CACHE_ENTRIES = 500;

type YrNoInstantDetails = {
  air_temperature?: number;
  relative_humidity?: number;
  wind_from_direction?: number;
  wind_speed?: number;
};

type YrNoForecastDetails = {
  precipitation_amount?: number;
  probability_of_precipitation?: number;
};

type YrNoForecastBlock = {
  summary?: { symbol_code?: string };
  details?: YrNoForecastDetails;
};

type YrNoTimeseriesData = {
  instant?: { details?: YrNoInstantDetails };
  next_1_hours?: YrNoForecastBlock;
  next_6_hours?: YrNoForecastBlock;
  next_12_hours?: YrNoForecastBlock;
};

type YrNoTimeseries = {
  time: string;
  data: YrNoTimeseriesData;
};

type YrNoResponse = {
  properties: {
    timeseries: YrNoTimeseries[];
  };
};

type CacheEntry = {
  payload: YrNoResponse;
  lastModified?: string;
  /** Absolute unix ms when this entry stops being fresh. */
  expires: number;
};

/**
 * Concrete `WeatherProvider` backed by Met.no's Locationforecast 2.0 API
 * (https://api.met.no), the API behind the Yr.no service.
 *
 * Unlike Open-Meteo, the upstream returns the whole forecast in a single
 * payload (a timeseries that mixes "current" with multi-day forecast) — so
 * this adapter has a single fetch path keyed by coordinate, and the bundle
 * + hourly methods both slice the same cached payload.
 *
 * Met.no's TOS require respecting their HTTP caching headers (`Last-Modified`
 * + `Expires`) — repeated unconditional GETs can get the client blocked. The
 * adapter caches the response and, when the `Expires` window has lapsed,
 * revalidates with `If-Modified-Since`. A 304 keeps the cached payload and
 * extends its expiry; a 200 replaces it. This is the reason Yr.no is NOT
 * wrapped with the generic LRU+TTL `createCachedProvider` — that would
 * defeat the conditional-GET contract.
 *
 * Limitations of the Yr.no mapping (left null in the unified schema):
 *  - `apparentTemperature`: not exposed by Locationforecast.
 *  - `uvIndex`: lives on a separate `/sunrise/3.0/uv` endpoint; skipped
 *    rather than triggering an extra HTTP call.
 *  - `soilMoisture`: not exposed.
 *  - `weatherCode`: Yr.no uses string `symbol_code` values
 *    ("partlycloudy_day", etc.) that don't map 1:1 onto WMO codes; a
 *    Phase 4 polish item if the UI needs an icon for Yr.no readings.
 *
 * `fetch` and `now` are injected for testability (deterministic time for
 * cache-expiry assertions, controlled response bodies).
 */
export function createYrNoProvider(
  deps: { fetch?: typeof fetch; now?: () => Date } = {},
): WeatherProvider {
  const fetchFn = deps.fetch ?? fetch;
  const now = deps.now ?? (() => new Date());
  const cache = new LRUCache<string, CacheEntry>({ max: MAX_CACHE_ENTRIES });

  async function fetchOrRefresh(latitude: number, longitude: number): Promise<YrNoResponse> {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = cache.get(key);
    const nowMs = now().getTime();

    if (cached && cached.expires > nowMs) {
      return cached.payload;
    }

    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (cached?.lastModified) {
      headers["If-Modified-Since"] = cached.lastModified;
    }

    let response: Response;
    try {
      response = await fetchFn(`${BASE_URL}?lat=${latitude}&lon=${longitude}`, { headers });
    } catch (cause) {
      throw new WeatherProviderFetchFailed(
        "yr-no",
        cause instanceof Error ? cause.message : "network error",
      );
    }

    if (response.status === 304 && cached) {
      const expires = parseExpires(response.headers.get("expires"), nowMs);
      cache.set(key, { ...cached, expires });
      return cached.payload;
    }

    if (!response.ok) {
      throw new WeatherProviderFetchFailed(
        "yr-no",
        `HTTP ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as YrNoResponse;
    const lastModified = response.headers.get("last-modified") ?? undefined;
    const expires = parseExpires(response.headers.get("expires"), nowMs);
    cache.set(key, { payload, lastModified, expires });
    return payload;
  }

  return {
    id: "yr-no",
    displayName: "Yr.no",
    requiresApiKey: false,
    isAvailable: () => true,

    // Yr.no serves a single internal blend (MEPS + ECMWF) and has no
    // `models=` equivalent — `opts.model` is intentionally ignored. The use
    // case rejects an explicit model on this provider before the call ever
    // gets here.
    async getCurrentAndDaily(latitude, longitude, days) {
      const payload = await fetchOrRefresh(latitude, longitude);
      const timeseries = payload.properties.timeseries;
      return {
        current: mapCurrent(timeseries[0]),
        daily: aggregateDaily(timeseries).slice(0, days),
      };
    },

    async getHourly(latitude, longitude, isoDate) {
      const payload = await fetchOrRefresh(latitude, longitude);
      return payload.properties.timeseries
        .filter((entry) => entry.time.startsWith(isoDate))
        .map(mapHourly);
    },
  };
}

function parseExpires(headerValue: string | null, nowMs: number): number {
  if (!headerValue) return nowMs + FALLBACK_EXPIRY_MS;
  const parsed = Date.parse(headerValue);
  if (Number.isNaN(parsed)) return nowMs + FALLBACK_EXPIRY_MS;
  return parsed;
}

function mapCurrent(entry: YrNoTimeseries | undefined): CurrentWeather {
  if (!entry) {
    throw new WeatherProviderFetchFailed("yr-no", "response had empty timeseries");
  }
  const instant = entry.data.instant?.details ?? {};
  const next1 = entry.data.next_1_hours?.details ?? {};

  return {
    providerId: "yr-no",
    observedAt: entry.time,
    temperature: nullable(instant.air_temperature),
    apparentTemperature: null,
    // Semantically Yr.no exposes "next hour", not "last hour" — we surface
    // it under `precipitationLastHour` as the closest available signal; the
    // UI explains the cross-provider semantics gap.
    precipitationLastHour: nullable(next1.precipitation_amount),
    precipitationProbability: nullable(next1.probability_of_precipitation),
    windSpeed: instant.wind_speed != null ? round1(instant.wind_speed * 3.6) : null,
    windDirection: nullable(instant.wind_from_direction),
    humidity: nullable(instant.relative_humidity),
    uvIndex: null,
    soilMoisture: null,
    weatherCode: null,
  };
}

function aggregateDaily(timeseries: YrNoTimeseries[]): DailyForecast[] {
  // Group entries by UTC date — Yr.no's `time` is already ISO UTC, so a
  // 10-char prefix is the date.
  const byDate = new Map<string, YrNoTimeseries[]>();
  for (const entry of timeseries) {
    const date = entry.time.slice(0, 10);
    const arr = byDate.get(date) ?? [];
    arr.push(entry);
    byDate.set(date, arr);
  }

  const days: DailyForecast[] = [];
  for (const [date, entries] of byDate) {
    const temperatures: number[] = [];
    const humidities: number[] = [];
    const windSpeedsKmh: number[] = [];
    const probabilities: number[] = [];
    let precipitationSum = 0;
    let precipitationContributors = 0;

    for (const entry of entries) {
      const instant = entry.data.instant?.details;
      if (instant?.air_temperature != null) temperatures.push(instant.air_temperature);
      if (instant?.relative_humidity != null) humidities.push(instant.relative_humidity);
      if (instant?.wind_speed != null) windSpeedsKmh.push(instant.wind_speed * 3.6);

      // Pick the highest-resolution forecast bucket present on this entry.
      // Yr.no's timeseries spacing matches the bucket size (hourly entries
      // expose next_1_hours; entries every 6h expose next_6_hours), so
      // summing one bucket per entry doesn't double-count.
      const bucket = entry.data.next_1_hours ?? entry.data.next_6_hours ?? entry.data.next_12_hours;
      const details = bucket?.details;
      if (details?.precipitation_amount != null) {
        precipitationSum += details.precipitation_amount;
        precipitationContributors += 1;
      }
      if (details?.probability_of_precipitation != null) {
        probabilities.push(details.probability_of_precipitation);
      }
    }

    days.push({
      date,
      temperatureMin: temperatures.length ? round1(Math.min(...temperatures)) : null,
      temperatureMax: temperatures.length ? round1(Math.max(...temperatures)) : null,
      precipitationSum: precipitationContributors > 0 ? round1(precipitationSum) : null,
      precipitationProbabilityMax: probabilities.length ? Math.max(...probabilities) : null,
      windSpeedMax: windSpeedsKmh.length ? round1(Math.max(...windSpeedsKmh)) : null,
      humidityMean: humidities.length ? round1(mean(humidities)) : null,
      weatherCode: null,
    });
  }
  return days;
}

function mapHourly(entry: YrNoTimeseries): HourlyForecast {
  const instant = entry.data.instant?.details ?? {};
  const next1 = entry.data.next_1_hours?.details;
  return {
    time: entry.time,
    temperature: nullable(instant.air_temperature),
    precipitation: nullable(next1?.precipitation_amount),
    precipitationProbability: nullable(next1?.probability_of_precipitation),
    windSpeed: instant.wind_speed != null ? round1(instant.wind_speed * 3.6) : null,
    windDirection: nullable(instant.wind_from_direction),
    humidity: nullable(instant.relative_humidity),
    weatherCode: null,
  };
}

function nullable(value: number | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function mean(values: number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
