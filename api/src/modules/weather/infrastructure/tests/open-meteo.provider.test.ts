import { currentAndDailySchema, hourlyForecastListSchema } from "@agriwatch/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeatherProviderFetchFailed } from "../../domain/weather.errors.ts";
import { createOpenMeteoProvider } from "../open-meteo.provider.ts";

type Json = Record<string, unknown>;

function jsonResponse(body: Json, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function mockFetch(impl: (input: string | URL | Request) => Promise<Response>) {
  return vi.fn(async (input: string | URL | Request) => impl(input));
}

describe("createOpenMeteoProvider", () => {
  describe("getCurrentAndDaily", () => {
    it("maps current, daily, and pulls precipitation_probability / UV / soil moisture from hourly at the matching index", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({
          current: {
            time: "2026-05-15T13:00",
            temperature_2m: 18.4,
            apparent_temperature: 17.1,
            precipitation: 0.2,
            wind_speed_10m: 12.4,
            wind_direction_10m: 270,
            relative_humidity_2m: 60,
            weather_code: 1,
          },
          hourly: {
            time: ["2026-05-15T12:00", "2026-05-15T13:00", "2026-05-15T14:00"],
            precipitation_probability: [10, 20, 30],
            soil_moisture_0_to_1cm: [0.24, 0.25, 0.26],
            uv_index: [4, 5, 6],
          },
          daily: {
            time: ["2026-05-15", "2026-05-16"],
            temperature_2m_min: [12, 13],
            temperature_2m_max: [22, 24],
            precipitation_sum: [1.2, 0],
            precipitation_probability_max: [40, 5],
            wind_speed_10m_max: [18, 20],
            wind_direction_10m_dominant: [270, 280],
            weather_code: [2, 1],
          },
        }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      const bundle = await provider.getCurrentAndDaily(47.5, 7.5, 2);

      expect(currentAndDailySchema.parse(bundle)).toEqual(bundle);
      expect(bundle.current).toMatchObject({
        providerId: "open-meteo",
        observedAt: "2026-05-15T13:00:00.000Z",
        temperature: 18.4,
        apparentTemperature: 17.1,
        precipitationLastHour: 0.2,
        precipitationProbability: 20,
        windSpeed: 12.4,
        windDirection: 270,
        humidity: 60,
        uvIndex: 5,
        soilMoisture: 0.25,
        weatherCode: 1,
      });
      expect(bundle.daily).toHaveLength(2);
      expect(bundle.daily[0]).toEqual({
        date: "2026-05-15",
        temperatureMin: 12,
        temperatureMax: 22,
        precipitationSum: 1.2,
        precipitationProbabilityMax: 40,
        windSpeedMax: 18,
        windDirectionDominant: 270,
        humidityMean: null,
        weatherCode: 2,
      });
    });

    it("makes exactly one HTTP call upstream", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({ current: { time: "2026-05-15T13:00" } }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      await provider.getCurrentAndDaily(47.5, 7.5, 7);

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("returns null for precipitation_probability / UV / soil moisture when the hourly index cannot be matched", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({
          current: { time: "2026-05-15T13:00", temperature_2m: 18 },
          hourly: {
            time: ["2026-05-15T10:00", "2026-05-15T11:00"],
            precipitation_probability: [10, 20],
            uv_index: [4, 5],
            soil_moisture_0_to_1cm: [0.24, 0.25],
          },
        }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      const { current } = await provider.getCurrentAndDaily(47.5, 7.5, 1);

      expect(current.precipitationProbability).toBeNull();
      expect(current.uvIndex).toBeNull();
      expect(current.soilMoisture).toBeNull();
      expect(current.temperature).toBe(18);
    });

    it("maps missing or undefined fields as null", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({ current: { time: "2026-05-15T13:00" } }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      const { current, daily } = await provider.getCurrentAndDaily(47.5, 7.5, 1);

      expect(current.temperature).toBeNull();
      expect(current.apparentTemperature).toBeNull();
      expect(current.precipitationLastHour).toBeNull();
      expect(current.precipitationProbability).toBeNull();
      expect(current.windSpeed).toBeNull();
      expect(current.windDirection).toBeNull();
      expect(current.humidity).toBeNull();
      expect(current.uvIndex).toBeNull();
      expect(current.soilMoisture).toBeNull();
      expect(current.weatherCode).toBeNull();
      expect(daily).toEqual([]);
    });

    it("throws WeatherProviderFetchFailed when `current.time` is missing", async () => {
      const fetchFn = mockFetch(async () => jsonResponse({ current: {} }));
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      await expect(provider.getCurrentAndDaily(47.5, 7.5, 7)).rejects.toBeInstanceOf(
        WeatherProviderFetchFailed,
      );
    });

    it("preserves a wind direction of 0 (true north) rather than coercing it to null", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({
          current: { time: "2026-05-15T13:00", wind_direction_10m: 0 },
        }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      const { current } = await provider.getCurrentAndDaily(47.5, 7.5, 1);

      expect(current.windDirection).toBe(0);
    });

    it("forwards `opts.model` to Open-Meteo via the `models=` param", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({ current: { time: "2026-05-15T13:00" } }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      await provider.getCurrentAndDaily(47.5, 7.5, 7, { model: "ecmwf_ifs04" });

      const url = new URL(fetchFn.mock.calls[0]?.[0] as string);
      expect(url.searchParams.get("models")).toBe("ecmwf_ifs04");
    });

    it("does NOT send a `models=` param for the `best_match` shortcut (it's Open-Meteo's default)", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({ current: { time: "2026-05-15T13:00" } }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      await provider.getCurrentAndDaily(47.5, 7.5, 7, { model: "best_match" });

      const url = new URL(fetchFn.mock.calls[0]?.[0] as string);
      expect(url.searchParams.get("models")).toBeNull();
    });

    it("exposes the curated list of Open-Meteo models via the `models` property", () => {
      const provider = createOpenMeteoProvider({ fetch: mockFetch(async () => jsonResponse({})) });

      const modelIds = provider.models?.map((m) => m.id) ?? [];
      expect(modelIds).toContain("best_match");
      expect(modelIds).toContain("ecmwf_ifs025");
      expect(modelIds).toContain("icon_seamless");
      expect(modelIds).toContain("gfs_global");
    });

    it("requests the documented set of current, hourly and daily variables in a single call", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({ current: { time: "2026-05-15T13:00" } }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      await provider.getCurrentAndDaily(47.5, 7.5, 14);

      const url = new URL(fetchFn.mock.calls[0]?.[0] as string);
      expect(url.searchParams.get("latitude")).toBe("47.5");
      expect(url.searchParams.get("longitude")).toBe("7.5");
      expect(url.searchParams.get("timezone")).toBe("UTC");
      expect(url.searchParams.get("forecast_days")).toBe("14");
      expect(url.searchParams.get("current")).toContain("temperature_2m");
      expect(url.searchParams.get("daily")).toContain("temperature_2m_min");
      expect(url.searchParams.get("hourly")).toContain("uv_index");
      expect(url.searchParams.get("hourly")).toContain("soil_moisture_0_to_1cm");
      expect(url.searchParams.get("hourly")).toContain("precipitation_probability");
    });
  });

  describe("getHourly", () => {
    it("maps the hourly arrays to a list of HourlyForecast objects", async () => {
      const fetchFn = mockFetch(async () =>
        jsonResponse({
          hourly: {
            time: ["2026-05-15T00:00", "2026-05-15T01:00"],
            temperature_2m: [10, 11],
            precipitation: [0, 0.1],
            precipitation_probability: [5, 10],
            wind_speed_10m: [6, 7],
            wind_direction_10m: [180, 190],
            relative_humidity_2m: [80, 78],
            weather_code: [1, 2],
          },
        }),
      );
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      const hours = await provider.getHourly(47.5, 7.5, "2026-05-15");

      expect(hourlyForecastListSchema.parse(hours)).toEqual(hours);
      expect(hours[0]).toEqual({
        time: "2026-05-15T00:00:00.000Z",
        temperature: 10,
        precipitation: 0,
        precipitationProbability: 5,
        windSpeed: 6,
        windDirection: 180,
        humidity: 80,
        weatherCode: 1,
      });
      expect(hours).toHaveLength(2);
    });

    it("returns an empty list when `hourly.time` is missing", async () => {
      const fetchFn = mockFetch(async () => jsonResponse({}));
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      await expect(provider.getHourly(47.5, 7.5, "2026-05-15")).resolves.toEqual([]);
    });

    it("scopes the request to the requested ISO date via start_date / end_date", async () => {
      const fetchFn = mockFetch(async () => jsonResponse({}));
      const provider = createOpenMeteoProvider({ fetch: fetchFn });

      await provider.getHourly(47.5, 7.5, "2026-05-20");

      const url = new URL(fetchFn.mock.calls[0]?.[0] as string);
      expect(url.searchParams.get("start_date")).toBe("2026-05-20");
      expect(url.searchParams.get("end_date")).toBe("2026-05-20");
    });
  });

  describe("error handling", () => {
    let provider: ReturnType<typeof createOpenMeteoProvider>;
    let fetchFn: ReturnType<typeof mockFetch>;

    beforeEach(() => {
      fetchFn = mockFetch(async () => jsonResponse({}));
      provider = createOpenMeteoProvider({ fetch: fetchFn });
    });

    it("throws WeatherProviderFetchFailed on a non-2xx HTTP response", async () => {
      fetchFn.mockImplementationOnce(async () => new Response("nope", { status: 503 }));

      await expect(provider.getCurrentAndDaily(47.5, 7.5, 7)).rejects.toBeInstanceOf(
        WeatherProviderFetchFailed,
      );
    });

    it("throws WeatherProviderFetchFailed when fetch itself rejects", async () => {
      fetchFn.mockImplementationOnce(async () => {
        throw new TypeError("network");
      });

      await expect(provider.getCurrentAndDaily(47.5, 7.5, 7)).rejects.toBeInstanceOf(
        WeatherProviderFetchFailed,
      );
    });
  });
});
