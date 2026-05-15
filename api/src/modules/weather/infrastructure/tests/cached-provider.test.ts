import type {
  CurrentWeather,
  DailyForecast,
  GeocodingResult,
  HourlyForecast,
} from "@agriwatch/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WeatherProvider } from "../../ports/weather-provider.ts";
import { createCachedProvider } from "../cached-provider.ts";

const ttls = {
  currentMs: 30,
  dailyMs: 30,
  hourlyMs: 30,
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildCurrentWeather(over: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
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
    ...over,
  };
}

function buildDailyForecast(over: Partial<DailyForecast> = {}): DailyForecast {
  return {
    date: "2026-05-15",
    temperatureMin: 12,
    temperatureMax: 22,
    precipitationSum: 1.2,
    precipitationProbabilityMax: 40,
    windSpeedMax: 18,
    humidityMean: 65,
    weatherCode: 2,
    ...over,
  };
}

function buildHourlyForecast(over: Partial<HourlyForecast> = {}): HourlyForecast {
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

function buildFakeProvider(overrides: Partial<WeatherProvider> = {}): WeatherProvider & {
  spies: {
    getCurrent: ReturnType<typeof vi.fn>;
    getDailyForecast: ReturnType<typeof vi.fn>;
    getHourlyForecast: ReturnType<typeof vi.fn>;
  };
} {
  const getCurrent = vi.fn(async () => buildCurrentWeather());
  const getDailyForecast = vi.fn(async (_lat, _lng, days: number) =>
    Array.from({ length: days }, (_, i) =>
      buildDailyForecast({ date: `2026-05-${String(15 + i).padStart(2, "0")}` }),
    ),
  );
  const getHourlyForecast = vi.fn(async () => [buildHourlyForecast()]);

  return {
    id: "open-meteo",
    displayName: "Open-Meteo",
    requiresApiKey: false,
    isAvailable: () => true,
    getCurrent,
    getDailyForecast,
    getHourlyForecast,
    spies: { getCurrent, getDailyForecast, getHourlyForecast },
    ...overrides,
  };
}

describe("createCachedProvider", () => {
  let provider: ReturnType<typeof buildFakeProvider>;

  beforeEach(() => {
    provider = buildFakeProvider();
  });

  it("forwards the first call and serves later identical calls from cache", async () => {
    const cached = createCachedProvider(provider, ttls);

    await cached.getCurrent(47.5, 7.5);
    await cached.getCurrent(47.5, 7.5);
    await cached.getCurrent(47.5, 7.5);

    expect(provider.spies.getCurrent).toHaveBeenCalledTimes(1);
  });

  it("re-fetches once the TTL elapses", async () => {
    const cached = createCachedProvider(provider, ttls);

    await cached.getCurrent(47.5, 7.5);
    await wait(50);
    await cached.getCurrent(47.5, 7.5);

    expect(provider.spies.getCurrent).toHaveBeenCalledTimes(2);
  });

  it("keys cache by coordinates rounded to 4 decimals so near-identical points share an entry", async () => {
    const cached = createCachedProvider(provider, ttls);

    await cached.getCurrent(47.500_01, 7.500_01);
    await cached.getCurrent(47.500_04, 7.500_03);

    expect(provider.spies.getCurrent).toHaveBeenCalledTimes(1);
  });

  it("treats different coordinates as distinct cache entries", async () => {
    const cached = createCachedProvider(provider, ttls);

    await cached.getCurrent(47.5, 7.5);
    await cached.getCurrent(48.0, 7.5);

    expect(provider.spies.getCurrent).toHaveBeenCalledTimes(2);
  });

  it("keys the daily forecast cache by the `days` parameter too", async () => {
    const cached = createCachedProvider(provider, ttls);

    await cached.getDailyForecast(47.5, 7.5, 7);
    await cached.getDailyForecast(47.5, 7.5, 14);
    await cached.getDailyForecast(47.5, 7.5, 7);

    expect(provider.spies.getDailyForecast).toHaveBeenCalledTimes(2);
  });

  it("keys the hourly forecast cache by the requested ISO date", async () => {
    const cached = createCachedProvider(provider, ttls);

    await cached.getHourlyForecast(47.5, 7.5, "2026-05-15");
    await cached.getHourlyForecast(47.5, 7.5, "2026-05-16");
    await cached.getHourlyForecast(47.5, 7.5, "2026-05-15");

    expect(provider.spies.getHourlyForecast).toHaveBeenCalledTimes(2);
  });

  it("keeps caches per method isolated — a current hit does not satisfy a daily call", async () => {
    const cached = createCachedProvider(provider, ttls);

    await cached.getCurrent(47.5, 7.5);
    await cached.getDailyForecast(47.5, 7.5, 7);

    expect(provider.spies.getCurrent).toHaveBeenCalledTimes(1);
    expect(provider.spies.getDailyForecast).toHaveBeenCalledTimes(1);
  });

  it("exposes getGeocoding when the wrapped provider exposes it", async () => {
    const result: GeocodingResult = {
      name: "Yverdon-les-Bains",
      displayName: "Yverdon-les-Bains, Vaud, Switzerland",
      latitude: 46.778,
      longitude: 6.641,
      countryCode: "CH",
      country: "Switzerland",
      admin1: "Vaud",
      timezone: "Europe/Zurich",
    };
    const getGeocoding = vi.fn(async () => [result]);
    const providerWithGeocoding = buildFakeProvider({ getGeocoding });

    const cached = createCachedProvider(providerWithGeocoding, ttls);

    expect(cached.getGeocoding).toBeDefined();
    await expect(cached.getGeocoding?.("yverdon")).resolves.toEqual([result]);
    expect(getGeocoding).toHaveBeenCalledTimes(1);
  });

  it("omits getGeocoding when the wrapped provider does not implement it", () => {
    const cached = createCachedProvider(provider, ttls);
    expect(cached.getGeocoding).toBeUndefined();
  });

  it("preserves the wrapped provider's identity metadata", () => {
    const cached = createCachedProvider(provider, ttls);

    expect(cached.id).toBe(provider.id);
    expect(cached.displayName).toBe(provider.displayName);
    expect(cached.requiresApiKey).toBe(provider.requiresApiKey);
    expect(cached.isAvailable()).toBe(true);
  });
});
