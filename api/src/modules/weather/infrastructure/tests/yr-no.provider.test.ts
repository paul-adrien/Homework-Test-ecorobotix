import { currentAndDailySchema, hourlyForecastListSchema } from "@agriwatch/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeatherProviderFetchFailed } from "../../domain/weather.errors.ts";
import { createYrNoProvider } from "../yr-no.provider.ts";

type Json = Record<string, unknown>;

const T0 = new Date("2026-05-15T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function jsonResponse(body: Json, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers as Record<string, string>) },
    ...init,
  });
}

function emptyResponse(status: number, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers });
}

function buildPayload(): Json {
  return {
    properties: {
      timeseries: [
        {
          time: "2026-05-15T12:00:00Z",
          data: {
            instant: {
              details: {
                air_temperature: 18.4,
                relative_humidity: 60,
                wind_from_direction: 270,
                wind_speed: 3.4,
              },
            },
            next_1_hours: {
              details: { precipitation_amount: 0.2, probability_of_precipitation: 20 },
            },
          },
        },
        {
          time: "2026-05-15T18:00:00Z",
          data: {
            instant: {
              details: {
                air_temperature: 22,
                relative_humidity: 50,
                wind_from_direction: 280,
                wind_speed: 5,
              },
            },
            next_1_hours: {
              details: { precipitation_amount: 0.1, probability_of_precipitation: 10 },
            },
          },
        },
        {
          time: "2026-05-16T06:00:00Z",
          data: {
            instant: {
              details: {
                air_temperature: 14,
                relative_humidity: 70,
                wind_from_direction: 200,
                wind_speed: 2,
              },
            },
            next_6_hours: {
              details: { precipitation_amount: 0.5, probability_of_precipitation: 40 },
            },
          },
        },
      ],
    },
  };
}

function mockFetch(impl: (input: string | URL | Request, init?: RequestInit) => Promise<Response>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => impl(input, init));
}

describe("createYrNoProvider", () => {
  describe("mapping", () => {
    it("maps the first timeseries entry to CurrentWeather (with wind m/s → km/h)", async () => {
      const fetchFn = mockFetch(async () => jsonResponse(buildPayload()));
      const provider = createYrNoProvider({ fetch: fetchFn, now: () => T0 });

      const bundle = await provider.getCurrentAndDaily(47.5, 7.5, 2);

      expect(currentAndDailySchema.parse(bundle)).toEqual(bundle);
      expect(bundle.current).toEqual({
        providerId: "yr-no",
        observedAt: "2026-05-15T12:00:00Z",
        temperature: 18.4,
        apparentTemperature: null,
        precipitationLastHour: 0.2,
        precipitationProbability: 20,
        windSpeed: 12.2, // 3.4 m/s × 3.6 = 12.24, rounded to 12.2
        windDirection: 270,
        humidity: 60,
        uvIndex: null,
        soilMoisture: null,
        weatherCode: null,
      });
    });

    it("aggregates the timeseries into per-UTC-date daily forecasts", async () => {
      const fetchFn = mockFetch(async () => jsonResponse(buildPayload()));
      const provider = createYrNoProvider({ fetch: fetchFn, now: () => T0 });

      const bundle = await provider.getCurrentAndDaily(47.5, 7.5, 7);

      expect(bundle.daily).toEqual([
        {
          date: "2026-05-15",
          temperatureMin: 18.4,
          temperatureMax: 22,
          precipitationSum: 0.3,
          precipitationProbabilityMax: 20,
          windSpeedMax: 18, // max(3.4, 5) m/s × 3.6 = 18
          windDirectionDominant: null, // Yr.no daily skips the circular mean
          humidityMean: 55,
          weatherCode: null,
        },
        {
          date: "2026-05-16",
          temperatureMin: 14,
          temperatureMax: 14,
          precipitationSum: 0.5,
          precipitationProbabilityMax: 40,
          windSpeedMax: 7.2,
          windDirectionDominant: null,
          humidityMean: 70,
          weatherCode: null,
        },
      ]);
    });

    it("slices the daily list to the requested `days` count", async () => {
      const fetchFn = mockFetch(async () => jsonResponse(buildPayload()));
      const provider = createYrNoProvider({ fetch: fetchFn, now: () => T0 });

      const bundle = await provider.getCurrentAndDaily(47.5, 7.5, 1);

      expect(bundle.daily).toHaveLength(1);
      expect(bundle.daily[0]?.date).toBe("2026-05-15");
    });

    it("filters the hourly forecast by the requested ISO date", async () => {
      const fetchFn = mockFetch(async () => jsonResponse(buildPayload()));
      const provider = createYrNoProvider({ fetch: fetchFn, now: () => T0 });

      const hours = await provider.getHourly(47.5, 7.5, "2026-05-15");

      expect(hourlyForecastListSchema.parse(hours)).toEqual(hours);
      expect(hours).toHaveLength(2);
      expect(hours[0]?.time).toBe("2026-05-15T12:00:00Z");
      expect(hours[1]?.time).toBe("2026-05-15T18:00:00Z");
    });

    it("throws WeatherProviderFetchFailed when the timeseries is empty", async () => {
      const fetchFn = mockFetch(async () => jsonResponse({ properties: { timeseries: [] } }));
      const provider = createYrNoProvider({ fetch: fetchFn, now: () => T0 });

      await expect(provider.getCurrentAndDaily(47.5, 7.5, 7)).rejects.toBeInstanceOf(
        WeatherProviderFetchFailed,
      );
    });

    it("sends the required User-Agent header", async () => {
      const fetchFn = mockFetch(async () => jsonResponse(buildPayload()));
      const provider = createYrNoProvider({ fetch: fetchFn, now: () => T0 });

      await provider.getCurrentAndDaily(47.5, 7.5, 7);

      const callInit = fetchFn.mock.calls[0]?.[1] as RequestInit | undefined;
      const headers = callInit?.headers as Record<string, string> | undefined;
      expect(headers?.["User-Agent"]).toMatch(/AgriWatch/);
    });
  });

  describe("HTTP-aware caching", () => {
    let nowMs: number;
    const setNow = (ms: number) => {
      nowMs = ms;
    };
    const now = () => new Date(nowMs);

    beforeEach(() => {
      setNow(T0.getTime());
    });

    it("serves repeated calls from the cache while the Expires window is in the future", async () => {
      const expiresAt = new Date(T0.getTime() + HOUR).toUTCString();
      const fetchFn = mockFetch(async () =>
        jsonResponse(buildPayload(), {
          headers: { "Last-Modified": "Fri, 15 May 2026 11:00:00 GMT", Expires: expiresAt },
        }),
      );
      const provider = createYrNoProvider({ fetch: fetchFn, now });

      await provider.getCurrentAndDaily(47.5, 7.5, 7);
      await provider.getCurrentAndDaily(47.5, 7.5, 7);
      await provider.getHourly(47.5, 7.5, "2026-05-15");

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("revalidates with If-Modified-Since once the cache entry is past its Expires", async () => {
      const lastModified = "Fri, 15 May 2026 11:00:00 GMT";
      const firstExpires = new Date(T0.getTime() + 5_000).toUTCString();
      const fetchFn = mockFetch(async () =>
        jsonResponse(buildPayload(), {
          headers: { "Last-Modified": lastModified, Expires: firstExpires },
        }),
      );
      const provider = createYrNoProvider({ fetch: fetchFn, now });

      await provider.getCurrentAndDaily(47.5, 7.5, 7);

      // Move past expiry. Next call must revalidate with `If-Modified-Since`.
      setNow(T0.getTime() + 60_000);
      fetchFn.mockImplementationOnce(async () =>
        emptyResponse(304, { Expires: new Date(nowMs + HOUR).toUTCString() }),
      );

      await provider.getCurrentAndDaily(47.5, 7.5, 7);

      expect(fetchFn).toHaveBeenCalledTimes(2);
      const secondCallInit = fetchFn.mock.calls[1]?.[1] as RequestInit | undefined;
      const secondHeaders = secondCallInit?.headers as Record<string, string> | undefined;
      expect(secondHeaders?.["If-Modified-Since"]).toBe(lastModified);
    });

    it("keeps the cached payload when upstream replies 304 (and extends the new Expires window)", async () => {
      const lastModified = "Fri, 15 May 2026 11:00:00 GMT";
      const firstExpires = new Date(T0.getTime() + 5_000).toUTCString();
      const fetchFn = mockFetch(async () =>
        jsonResponse(buildPayload(), {
          headers: { "Last-Modified": lastModified, Expires: firstExpires },
        }),
      );
      const provider = createYrNoProvider({ fetch: fetchFn, now });

      const first = await provider.getCurrentAndDaily(47.5, 7.5, 7);

      setNow(T0.getTime() + 60_000);
      fetchFn.mockImplementationOnce(async () =>
        emptyResponse(304, { Expires: new Date(nowMs + HOUR).toUTCString() }),
      );

      const second = await provider.getCurrentAndDaily(47.5, 7.5, 7);

      // 304 → cached payload reused, semantically identical bundle.
      expect(second).toEqual(first);

      // Within the extended Expires window, the next call hits cache, no extra fetch.
      setNow(nowMs + 60_000);
      await provider.getCurrentAndDaily(47.5, 7.5, 7);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("does not send If-Modified-Since on a cold miss", async () => {
      const fetchFn = mockFetch(async () => jsonResponse(buildPayload()));
      const provider = createYrNoProvider({ fetch: fetchFn, now });

      await provider.getCurrentAndDaily(47.5, 7.5, 7);

      const callInit = fetchFn.mock.calls[0]?.[1] as RequestInit | undefined;
      const headers = callInit?.headers as Record<string, string> | undefined;
      expect(headers?.["If-Modified-Since"]).toBeUndefined();
    });

    it("falls back to a short TTL when upstream omits the Expires header", async () => {
      const fetchFn = mockFetch(async () => jsonResponse(buildPayload(), { headers: {} }));
      const provider = createYrNoProvider({ fetch: fetchFn, now });

      await provider.getCurrentAndDaily(47.5, 7.5, 7);
      // Still within the 15-min fallback window.
      setNow(T0.getTime() + 5 * 60_000);
      await provider.getCurrentAndDaily(47.5, 7.5, 7);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Past the 15-min fallback → refetch.
      setNow(T0.getTime() + 20 * 60_000);
      await provider.getCurrentAndDaily(47.5, 7.5, 7);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("throws WeatherProviderFetchFailed on a non-2xx, non-304 HTTP response", async () => {
      const fetchFn = mockFetch(async () => emptyResponse(503));
      const provider = createYrNoProvider({ fetch: fetchFn });

      await expect(provider.getCurrentAndDaily(47.5, 7.5, 7)).rejects.toBeInstanceOf(
        WeatherProviderFetchFailed,
      );
    });

    it("throws WeatherProviderFetchFailed when fetch itself rejects", async () => {
      const fetchFn = mockFetch(async () => {
        throw new TypeError("network");
      });
      const provider = createYrNoProvider({ fetch: fetchFn });

      await expect(provider.getCurrentAndDaily(47.5, 7.5, 7)).rejects.toBeInstanceOf(
        WeatherProviderFetchFailed,
      );
    });
  });
});
