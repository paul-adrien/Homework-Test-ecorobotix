import type { CurrentAndDaily, HourlyForecast, WeatherProviderInfo } from "@agriwatch/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSessionCookieFor } from "../../../../shared/test/test-app.ts";
import {
  WeatherProviderFetchFailed,
  WeatherProviderModelNotAvailable,
  WeatherProviderNotAvailable,
} from "../../domain/weather.errors.ts";
import { buildCurrentAndDaily, buildHourlyForecast } from "../../test-fakes.ts";
import { buildTestApp } from "./test-app.ts";

let app: FastifyInstance;

const userId = "user-1";
let sessionCookie: string;

beforeEach(async () => {
  sessionCookie = await makeSessionCookieFor(userId);
});

afterEach(async () => {
  if (app) await app.close();
});

function buildDeps() {
  return {
    getCurrentAndDailyUseCase: vi.fn<(...args: unknown[]) => Promise<CurrentAndDaily>>(),
    getHourlyUseCase: vi.fn<(...args: unknown[]) => Promise<HourlyForecast[]>>(),
    listProvidersUseCase: vi.fn<() => WeatherProviderInfo[]>(() => []),
  };
}

describe("GET /api/weather", () => {
  it("401 without a session cookie", async () => {
    const deps = buildDeps();
    app = await buildTestApp(deps);

    const res = await app.inject({ method: "GET", url: "/api/weather?lat=47.5&lng=7.5" });

    expect(res.statusCode).toBe(401);
    expect(deps.getCurrentAndDailyUseCase).not.toHaveBeenCalled();
  });

  it("200 returns the bundle and forwards the parsed query to the use case", async () => {
    const bundle = buildCurrentAndDaily();
    const deps = buildDeps();
    deps.getCurrentAndDailyUseCase.mockResolvedValue(bundle);
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather?lat=47.5&lng=7.5&days=10&provider=yr-no",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(bundle);
    expect(deps.getCurrentAndDailyUseCase).toHaveBeenCalledWith({
      userId,
      latitude: 47.5,
      longitude: 7.5,
      days: 10,
      providerId: "yr-no",
    });
  });

  it("applies the default `days=7` when the query omits it", async () => {
    const deps = buildDeps();
    deps.getCurrentAndDailyUseCase.mockResolvedValue(buildCurrentAndDaily());
    app = await buildTestApp(deps);

    await app.inject({
      method: "GET",
      url: "/api/weather?lat=47.5&lng=7.5",
      cookies: { session: sessionCookie },
    });

    expect(deps.getCurrentAndDailyUseCase).toHaveBeenCalledWith(
      expect.objectContaining({ days: 7, providerId: undefined }),
    );
  });

  it("400 when the latitude is out of range", async () => {
    const deps = buildDeps();
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather?lat=999&lng=7.5",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(400);
    expect(deps.getCurrentAndDailyUseCase).not.toHaveBeenCalled();
  });

  it("404 when the use case raises WeatherProviderNotAvailable", async () => {
    const deps = buildDeps();
    deps.getCurrentAndDailyUseCase.mockRejectedValue(new WeatherProviderNotAvailable("yr-no"));
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather?lat=47.5&lng=7.5&provider=yr-no",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toContain("yr-no");
  });

  it("502 when the use case raises WeatherProviderFetchFailed", async () => {
    const deps = buildDeps();
    deps.getCurrentAndDailyUseCase.mockRejectedValue(
      new WeatherProviderFetchFailed("open-meteo", "HTTP 503"),
    );
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather?lat=47.5&lng=7.5",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(502);
  });

  it("400 when the use case raises WeatherProviderModelNotAvailable", async () => {
    const deps = buildDeps();
    deps.getCurrentAndDailyUseCase.mockRejectedValue(
      new WeatherProviderModelNotAvailable("open-meteo", "unknown_model"),
    );
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather?lat=47.5&lng=7.5&model=unknown_model",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("unknown_model");
  });

  it("forwards the `model` query param to the use case", async () => {
    const deps = buildDeps();
    deps.getCurrentAndDailyUseCase.mockResolvedValue(buildCurrentAndDaily());
    app = await buildTestApp(deps);

    await app.inject({
      method: "GET",
      url: "/api/weather?lat=47.5&lng=7.5&model=ecmwf_ifs04",
      cookies: { session: sessionCookie },
    });

    expect(deps.getCurrentAndDailyUseCase).toHaveBeenCalledWith(
      expect.objectContaining({ model: "ecmwf_ifs04" }),
    );
  });
});

describe("GET /api/weather/hourly", () => {
  it("401 without a session cookie", async () => {
    const deps = buildDeps();
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather/hourly?lat=47.5&lng=7.5&date=2026-05-20",
    });

    expect(res.statusCode).toBe(401);
  });

  it("200 returns the hourly forecast and forwards the parsed query", async () => {
    const hours = [buildHourlyForecast(), buildHourlyForecast({ temperature: 21 })];
    const deps = buildDeps();
    deps.getHourlyUseCase.mockResolvedValue(hours);
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather/hourly?lat=47.5&lng=7.5&date=2026-05-20&provider=open-meteo",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(hours);
    expect(deps.getHourlyUseCase).toHaveBeenCalledWith({
      userId,
      latitude: 47.5,
      longitude: 7.5,
      date: "2026-05-20",
      providerId: "open-meteo",
    });
  });

  it("400 when the date is not a YYYY-MM-DD string", async () => {
    const deps = buildDeps();
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather/hourly?lat=47.5&lng=7.5&date=not-a-date",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(400);
    expect(deps.getHourlyUseCase).not.toHaveBeenCalled();
  });

  it("404 when the use case raises WeatherProviderNotAvailable", async () => {
    const deps = buildDeps();
    deps.getHourlyUseCase.mockRejectedValue(new WeatherProviderNotAvailable("yr-no"));
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather/hourly?lat=47.5&lng=7.5&date=2026-05-20&provider=yr-no",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/weather/providers", () => {
  it("401 without a session cookie", async () => {
    const deps = buildDeps();
    app = await buildTestApp(deps);

    const res = await app.inject({ method: "GET", url: "/api/weather/providers" });

    expect(res.statusCode).toBe(401);
  });

  it("200 returns the list returned by the use case", async () => {
    const providers = [
      { id: "open-meteo" as const, displayName: "Open-Meteo", requiresApiKey: false },
      { id: "yr-no" as const, displayName: "Yr.no", requiresApiKey: false },
    ];
    const deps = buildDeps();
    deps.listProvidersUseCase.mockReturnValue(providers);
    app = await buildTestApp(deps);

    const res = await app.inject({
      method: "GET",
      url: "/api/weather/providers",
      cookies: { session: sessionCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(providers);
  });
});
