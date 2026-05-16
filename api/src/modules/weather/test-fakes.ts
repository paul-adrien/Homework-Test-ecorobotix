import type {
  CurrentAndDaily,
  HourlyForecast,
  WeatherProviderId,
  WeatherProviderModel,
} from "@agriwatch/shared";
import { vi } from "vitest";
import type { UserPreferencesReader } from "./ports/user-preferences-reader.ts";
import type { WeatherProvider } from "./ports/weather-provider.ts";

export function buildCurrentAndDaily(over: Partial<CurrentAndDaily> = {}): CurrentAndDaily {
  return {
    current: {
      providerId: "open-meteo",
      observedAt: "2026-05-15T12:00:00.000Z",
      temperature: 18,
      apparentTemperature: 17,
      precipitationLastHour: 0,
      precipitationProbability: 5,
      windSpeed: 10,
      windDirection: 270,
      humidity: 60,
      uvIndex: 4,
      soilMoisture: 0.25,
      weatherCode: 1,
    },
    daily: [
      {
        date: "2026-05-15",
        temperatureMin: 12,
        temperatureMax: 22,
        precipitationSum: 1.2,
        precipitationProbabilityMax: 40,
        windSpeedMax: 18,
        windDirectionDominant: 270,
        humidityMean: null,
        weatherCode: 2,
      },
    ],
    ...over,
  };
}

export function buildHourlyForecast(over: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    time: "2026-05-15T14:00:00.000Z",
    temperature: 20,
    precipitation: 0,
    precipitationProbability: 10,
    windSpeed: 12,
    windDirection: 280,
    humidity: 55,
    weatherCode: 1,
    ...over,
  };
}

type FakeProviderOptions = Readonly<{
  id?: WeatherProviderId;
  displayName?: string;
  requiresApiKey?: boolean;
  isAvailable?: boolean;
  models?: ReadonlyArray<WeatherProviderModel>;
  currentAndDaily?: CurrentAndDaily;
  hourly?: HourlyForecast[];
}>;

export function buildFakeProvider(options: FakeProviderOptions = {}): WeatherProvider & {
  spies: {
    getCurrentAndDaily: ReturnType<typeof vi.fn>;
    getHourly: ReturnType<typeof vi.fn>;
  };
} {
  const bundle = options.currentAndDaily ?? buildCurrentAndDaily();
  const hourly = options.hourly ?? [buildHourlyForecast()];
  const getCurrentAndDaily = vi.fn(async () => bundle);
  const getHourly = vi.fn(async () => hourly);

  return {
    id: options.id ?? "open-meteo",
    displayName: options.displayName ?? "Open-Meteo (test)",
    requiresApiKey: options.requiresApiKey ?? false,
    models: options.models,
    isAvailable: () => options.isAvailable ?? true,
    getCurrentAndDaily,
    getHourly,
    spies: { getCurrentAndDaily, getHourly },
  };
}

export function createInMemoryUserPreferencesReader(
  seed: Record<string, WeatherProviderId> = {},
): UserPreferencesReader {
  const store = new Map<string, WeatherProviderId>(Object.entries(seed));
  return {
    async getPreferredProvider(userId) {
      return store.get(userId) ?? null;
    },
  };
}
