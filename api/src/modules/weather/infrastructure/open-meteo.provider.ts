import type { CurrentWeather, DailyForecast, HourlyForecast } from "@agriwatch/shared";
import { WeatherProviderFetchFailed } from "../domain/weather.errors.ts";
import type { WeatherProvider } from "../ports/weather-provider.ts";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Variables exposed in the `current` block; precipitation_probability, UV index
// and soil moisture are NOT in `current` so we fetch them via the matching
// hourly index instead.
const CURRENT_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "relative_humidity_2m",
  "weather_code",
].join(",");

// Hourly variables we need at the current hour (alongside the `current` block)
// plus the ones used to fill `getHourlyForecast`.
const HOURLY_FOR_CURRENT = ["precipitation_probability", "soil_moisture_0_to_1cm", "uv_index"].join(
  ",",
);

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
    isAvailable: () => true,

    async getCurrent(latitude, longitude) {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: CURRENT_VARIABLES,
        hourly: HOURLY_FOR_CURRENT,
        timezone: "UTC",
        forecast_days: "1",
      });
      const data = await getJson(params);
      return mapCurrent(data);
    },

    async getDailyForecast(latitude, longitude, days) {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        daily: DAILY_VARIABLES,
        timezone: "UTC",
        forecast_days: String(days),
      });
      const data = await getJson(params);
      return mapDaily(data);
    },

    async getHourlyForecast(latitude, longitude, isoDate) {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        hourly: HOURLY_VARIABLES,
        timezone: "UTC",
        start_date: isoDate,
        end_date: isoDate,
      });
      const data = await getJson(params);
      return mapHourly(data);
    },
  };
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

  return dates.map((date, i) => ({
    date,
    temperatureMin: daily.temperature_2m_min?.[i] ?? null,
    temperatureMax: daily.temperature_2m_max?.[i] ?? null,
    precipitationSum: daily.precipitation_sum?.[i] ?? null,
    precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? null,
    windSpeedMax: daily.wind_speed_10m_max?.[i] ?? null,
    // Open-Meteo does not expose a daily humidity mean. Leaving it null is
    // honest; aggregating from hourly is a Phase 4 polish item.
    humidityMean: null,
    weatherCode: daily.weather_code?.[i] ?? null,
  }));
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
