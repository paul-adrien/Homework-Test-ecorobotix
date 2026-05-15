import { describe, expect, it } from "vitest";
import {
  WeatherProviderModelNotAvailable,
  WeatherProviderNotAvailable,
} from "../../domain/weather.errors.ts";
import {
  buildFakeProvider,
  buildHourlyForecast,
  createInMemoryUserPreferencesReader,
} from "../../test-fakes.ts";
import { createGetHourlyUseCase } from "../get-hourly.usecase.ts";

describe("getHourly use case", () => {
  it("forwards the latitude, longitude and date to the resolved provider", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetHourlyUseCase({ registry, userPreferencesReader });
    await useCase({
      userId: "user-1",
      latitude: 47.5,
      longitude: 7.5,
      date: "2026-05-20",
    });

    expect(openMeteo.spies.getHourly).toHaveBeenCalledWith(47.5, 7.5, "2026-05-20", {
      model: undefined,
    });
  });

  it("falls back to the user's preferred provider when no provider is pinned", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const yrNo = buildFakeProvider({ id: "yr-no" });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);
    const userPreferencesReader = createInMemoryUserPreferencesReader({ "user-1": "yr-no" });

    const useCase = createGetHourlyUseCase({ registry, userPreferencesReader });
    await useCase({ userId: "user-1", latitude: 47.5, longitude: 7.5, date: "2026-05-20" });

    expect(yrNo.spies.getHourly).toHaveBeenCalledTimes(1);
    expect(openMeteo.spies.getHourly).not.toHaveBeenCalled();
  });

  it("throws WeatherProviderNotAvailable when the resolved provider is unknown", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetHourlyUseCase({ registry, userPreferencesReader });

    await expect(
      useCase({
        userId: "user-1",
        latitude: 47.5,
        longitude: 7.5,
        date: "2026-05-20",
        providerId: "yr-no",
      }),
    ).rejects.toBeInstanceOf(WeatherProviderNotAvailable);
  });

  it("forwards a valid `model` to the provider", async () => {
    const openMeteo = buildFakeProvider({
      id: "open-meteo",
      models: [{ id: "ecmwf_ifs04", displayName: "ECMWF" }],
    });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetHourlyUseCase({ registry, userPreferencesReader });
    await useCase({
      userId: "user-1",
      latitude: 47.5,
      longitude: 7.5,
      date: "2026-05-20",
      model: "ecmwf_ifs04",
    });

    expect(openMeteo.spies.getHourly).toHaveBeenCalledWith(47.5, 7.5, "2026-05-20", {
      model: "ecmwf_ifs04",
    });
  });

  it("throws WeatherProviderModelNotAvailable when the model is unknown", async () => {
    const openMeteo = buildFakeProvider({
      id: "open-meteo",
      models: [{ id: "best_match", displayName: "Best match" }],
    });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetHourlyUseCase({ registry, userPreferencesReader });

    await expect(
      useCase({
        userId: "user-1",
        latitude: 47.5,
        longitude: 7.5,
        date: "2026-05-20",
        model: "unknown",
      }),
    ).rejects.toBeInstanceOf(WeatherProviderModelNotAvailable);
    expect(openMeteo.spies.getHourly).not.toHaveBeenCalled();
  });

  it("returns the hourly forecast exactly as the provider returns it", async () => {
    const hourly = [
      buildHourlyForecast({ time: "2026-05-20T00:00:00.000Z", temperature: 10 }),
      buildHourlyForecast({ time: "2026-05-20T01:00:00.000Z", temperature: 11 }),
    ];
    const openMeteo = buildFakeProvider({ hourly });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetHourlyUseCase({ registry, userPreferencesReader });
    const result = await useCase({
      userId: "user-1",
      latitude: 47.5,
      longitude: 7.5,
      date: "2026-05-20",
    });

    expect(result).toBe(hourly);
  });
});
