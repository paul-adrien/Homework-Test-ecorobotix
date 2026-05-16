import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherProviderModel,
} from "@agriwatch/shared";
import { WeatherProviderFetchFailed } from "../domain/weather.errors.ts";
import type { WeatherProvider } from "../ports/weather-provider.ts";

/**
 * Curated subset of Open-Meteo's `models=` parameter values, ordered as
 * they should appear in the frontend dropdown. `best_match` is Open-Meteo's
 * own auto-select (their default), kept first as the "safe" choice. The
 * other three are the most widely-cited global models in agri forecasting.
 *
 * Adding a new model = add an entry here, no other code change.
 */
export const OPEN_METEO_MODELS: ReadonlyArray<WeatherProviderModel> = [
  { id: "best_match", displayName: "Best match (auto)" },
  { id: "ecmwf_ifs04", displayName: "ECMWF (European)" },
  { id: "icon_seamless", displayName: "ICON (DWD · German)" },
  { id: "gfs_global", displayName: "GFS (US)" },
];

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Variables exposed in the `current` block. precipitation_probability, UV
// index and soil moisture are NOT in `current` so we fetch them via the
// matching hourly index instead.
const CURRENT_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "relative_humidity_2m",
  "weather_code",
].join(",");

// Hourly variables piggy-backed on the bundle request so we can fill the
// fields that the `current` block doesn't expose AND aggregate a per-day
// humidity mean (Open-Meteo's daily endpoint has no humidity figure).
const HOURLY_FOR_CURRENT = [
  "precipitation_probability",
  "relative_humidity_2m",
  "soil_moisture_0_to_1cm",
  "uv_index",
].join(",");

// Hourly variables exposed by `getHourly` (drill-down for a specific day).
const HOURLY_VARIABLES = [
  "temperature_2m",
  "precipitation",
  "precipitation_probability",
  "wind_speed_10m",
  "wind_direction_10m",
  "relative_humidity_2m",
  "weather_code",
].join(",");

const DAILY_VARIABLES = [
  "temperature_2m_min",
  "temperature_2m_max",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_direction_10m_dominant",
  "weather_code",
].join(",");

type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number | null;
  apparent_temperature?: number | null;
  precipitation?: number | null;
  wind_speed_10m?: number | null;
  wind_direction_10m?: number | null;
  relative_humidity_2m?: number | null;
  weather_code?: number | null;
};

type OpenMeteoHourly = {
  time?: string[];
  temperature_2m?: Array<number | null>;
  precipitation?: Array<number | null>;
  precipitation_probability?: Array<number | null>;
  wind_speed_10m?: Array<number | null>;
  wind_direction_10m?: Array<number | null>;
  relative_humidity_2m?: Array<number | null>;
  weather_code?: Array<number | null>;
  soil_moisture_0_to_1cm?: Array<number | null>;
  uv_index?: Array<number | null>;
};

type OpenMeteoDaily = {
  time?: string[];
  temperature_2m_min?: Array<number | null>;
  temperature_2m_max?: Array<number | null>;
  precipitation_sum?: Array<number | null>;
  precipitation_probability_max?: Array<number | null>;
  wind_speed_10m_max?: Array<number | null>;
  wind_direction_10m_dominant?: Array<number | null>;
  weather_code?: Array<number | null>;
};

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
  daily?: OpenMeteoDaily;
};

/**
 * Concrete `WeatherProvider` backed by Open-Meteo's free forecast API
 * (https://open-meteo.com). No API key required, generous rate limits.
 *
 * Both methods make exactly one HTTP call upstream — Open-Meteo accepts
 * `current=...&daily=...&hourly=...` in a single request, so the dashboard
 * view comes back in one round trip and stays internally consistent.
 *
 * `fetch` is injected as a dependency so the mapping can be tested in
 * isolation without going over the network; production wiring leaves it
 * undefined and falls back to the global `fetch`.
 */
export function createOpenMeteoProvider(deps: { fetch?: typeof fetch } = {}): WeatherProvider {
  const fetchFn = deps.fetch ?? fetch;

  async function getJson(searchParams: URLSearchParams): Promise<OpenMeteoResponse> {
    const url = `${BASE_URL}?${searchParams.toString()}`;
    let response: Response;
    try {
      response = await fetchFn(url);
    } catch (cause) {
      throw new WeatherProviderFetchFailed(
        "open-meteo",
        cause instanceof Error ? cause.message : "network error",
      );
    }
    if (!response.ok) {
      throw new WeatherProviderFetchFailed(
        "open-meteo",
        `HTTP ${response.status} ${response.statusText}`,
      );
    }
    return (await response.json()) as OpenMeteoResponse;
  }

  return {
    id: "open-meteo",
    displayName: "Open-Meteo",
    requiresApiKey: false,
    models: OPEN_METEO_MODELS,
    isAvailable: () => true,

    async getCurrentAndDaily(latitude, longitude, days, opts) {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: CURRENT_VARIABLES,
        hourly: HOURLY_FOR_CURRENT,
        daily: DAILY_VARIABLES,
        timezone: "UTC",
        forecast_days: String(days),
      });
      applyModel(params, opts?.model);
      const data = await getJson(params);
      return {
        current: mapCurrent(data),
        daily: mapDaily(data),
      };
    },

    async getHourly(latitude, longitude, isoDate, opts) {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        hourly: HOURLY_VARIABLES,
        timezone: "UTC",
        start_date: isoDate,
        end_date: isoDate,
      });
      applyModel(params, opts?.model);
      const data = await getJson(params);
      return mapHourly(data);
    },
  };
}

/**
 * Forward the model selector to Open-Meteo via its `models=` param. The
 * `best_match` value is Open-Meteo's own default — omitting the param has
 * the same effect, so we skip it to keep request URLs minimal and improve
 * cache key locality across "pin best_match" vs "no pin" callers.
 */
function applyModel(params: URLSearchParams, modelId: string | undefined): void {
  if (modelId && modelId !== "best_match") {
    params.set("models", modelId);
  }
}

function mapCurrent(data: OpenMeteoResponse): CurrentWeather {
  const current = data.current;
  if (!current?.time) {
    throw new WeatherProviderFetchFailed("open-meteo", "response missing `current.time`");
  }

  // Open-Meteo doesn't expose precipitation_probability, UV index and soil
  // moisture in the `current` block, so we pull them from the hourly array at
  // the index matching `current.time`. If the timestamp can't be matched we
  // leave them as null instead of guessing — explicit beats wrong.
  const hourly = data.hourly;
  const hourlyIndex = hourly?.time ? hourly.time.indexOf(current.time) : -1;
  const valueAtIndex = (series: Array<number | null> | undefined): number | null =>
    hourlyIndex >= 0 ? (series?.[hourlyIndex] ?? null) : null;

  return {
    providerId: "open-meteo",
    observedAt: toIsoUtc(current.time),
    temperature: nullable(current.temperature_2m),
    apparentTemperature: nullable(current.apparent_temperature),
    precipitationLastHour: nullable(current.precipitation),
    precipitationProbability: valueAtIndex(hourly?.precipitation_probability),
    windSpeed: nullable(current.wind_speed_10m),
    windDirection: nullable(current.wind_direction_10m),
    humidity: nullable(current.relative_humidity_2m),
    uvIndex: valueAtIndex(hourly?.uv_index),
    soilMoisture: valueAtIndex(hourly?.soil_moisture_0_to_1cm),
    weatherCode: nullable(current.weather_code),
  };
}

function mapDaily(data: OpenMeteoResponse): DailyForecast[] {
  const daily = data.daily;
  if (!daily?.time) return [];
  const dates = daily.time;

  // Open-Meteo's daily endpoint has no humidity figure, but we pull
  // `relative_humidity_2m` in the hourly piggy-back already — so we compute
  // the daily mean here. Free aggregation, no extra HTTP call.
  const humidityMeanByDate = aggregateHumidityByDate(data.hourly);

  return dates.map((date, i) => ({
    date,
    temperatureMin: daily.temperature_2m_min?.[i] ?? null,
    temperatureMax: daily.temperature_2m_max?.[i] ?? null,
    precipitationSum: daily.precipitation_sum?.[i] ?? null,
    precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? null,
    windSpeedMax: daily.wind_speed_10m_max?.[i] ?? null,
    windDirectionDominant: daily.wind_direction_10m_dominant?.[i] ?? null,
    humidityMean: humidityMeanByDate.get(date) ?? null,
    weatherCode: daily.weather_code?.[i] ?? null,
  }));
}

function aggregateHumidityByDate(hourly: OpenMeteoHourly | undefined): Map<string, number> {
  const result = new Map<string, number>();
  const times = hourly?.time;
  const values = hourly?.relative_humidity_2m;
  if (!times || !values) return result;

  const sumsByDate = new Map<string, { sum: number; count: number }>();
  for (let i = 0; i < times.length; i += 1) {
    const time = times[i];
    const value = values[i];
    if (!time || value === null || value === undefined) continue;
    const date = time.slice(0, 10);
    const acc = sumsByDate.get(date) ?? { sum: 0, count: 0 };
    acc.sum += value;
    acc.count += 1;
    sumsByDate.set(date, acc);
  }

  for (const [date, { sum, count }] of sumsByDate) {
    result.set(date, sum / count);
  }
  return result;
}

function mapHourly(data: OpenMeteoResponse): HourlyForecast[] {
  const hourly = data.hourly;
  if (!hourly?.time) return [];
  const times = hourly.time;

  return times.map((time, i) => ({
    time: toIsoUtc(time),
    temperature: hourly.temperature_2m?.[i] ?? null,
    precipitation: hourly.precipitation?.[i] ?? null,
    precipitationProbability: hourly.precipitation_probability?.[i] ?? null,
    windSpeed: hourly.wind_speed_10m?.[i] ?? null,
    windDirection: hourly.wind_direction_10m?.[i] ?? null,
    humidity: hourly.relative_humidity_2m?.[i] ?? null,
    weatherCode: hourly.weather_code?.[i] ?? null,
  }));
}

function nullable(value: number | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

/**
 * Open-Meteo emits times like `"2026-05-15T13:00"` (no seconds, no offset)
 * in the timezone specified by the request. We always request `timezone=UTC`,
 * so we can safely append `:00Z` and round-trip through `Date` to obtain a
 * strict ISO-8601 UTC string that satisfies our shared Zod schemas.
 */
function toIsoUtc(time: string): string {
  const withSeconds = /:\d{2}:\d{2}/.test(time) ? time : `${time}:00`;
  return new Date(`${withSeconds}Z`).toISOString();
}
