import { describe, expect, it } from "vitest";
import { WeatherProviderNotAvailable } from "../../domain/weather.errors.ts";
import {
  buildCurrentAndDaily,
  buildFakeProvider,
  createInMemoryUserPreferencesReader,
} from "../../test-fakes.ts";
import { createGetCurrentAndDailyUseCase } from "../get-current-and-daily.usecase.ts";

describe("getCurrentAndDaily use case", () => {
  it("uses the provider pinned by the request when present", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const yrNo = buildFakeProvider({ id: "yr-no" });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);
    const userPreferencesReader = createInMemoryUserPreferencesReader({ "user-1": "open-meteo" });

    const useCase = createGetCurrentAndDailyUseCase({ registry, userPreferencesReader });
    await useCase({
      userId: "user-1",
      latitude: 47.5,
      longitude: 7.5,
      days: 7,
      providerId: "yr-no",
    });

    expect(yrNo.spies.getCurrentAndDaily).toHaveBeenCalledTimes(1);
    expect(openMeteo.spies.getCurrentAndDaily).not.toHaveBeenCalled();
  });

  it("falls back to the user's preferred provider when no `providerId` is pinned", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const yrNo = buildFakeProvider({ id: "yr-no" });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);
    const userPreferencesReader = createInMemoryUserPreferencesReader({ "user-1": "yr-no" });

    const useCase = createGetCurrentAndDailyUseCase({ registry, userPreferencesReader });
    await useCase({ userId: "user-1", latitude: 47.5, longitude: 7.5, days: 7 });

    expect(yrNo.spies.getCurrentAndDaily).toHaveBeenCalledTimes(1);
    expect(openMeteo.spies.getCurrentAndDaily).not.toHaveBeenCalled();
  });

  it("falls back to open-meteo when neither the request nor preferences supply a provider", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetCurrentAndDailyUseCase({ registry, userPreferencesReader });
    await useCase({ userId: "user-1", latitude: 47.5, longitude: 7.5, days: 7 });

    expect(openMeteo.spies.getCurrentAndDaily).toHaveBeenCalledWith(47.5, 7.5, 7);
  });

  it("throws WeatherProviderNotAvailable when the requested provider is not registered", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetCurrentAndDailyUseCase({ registry, userPreferencesReader });

    await expect(
      useCase({
        userId: "user-1",
        latitude: 47.5,
        longitude: 7.5,
        days: 7,
        providerId: "yr-no",
      }),
    ).rejects.toBeInstanceOf(WeatherProviderNotAvailable);
  });

  it("throws WeatherProviderNotAvailable when the resolved provider reports isAvailable() === false", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo", isAvailable: false });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetCurrentAndDailyUseCase({ registry, userPreferencesReader });

    await expect(
      useCase({ userId: "user-1", latitude: 47.5, longitude: 7.5, days: 7 }),
    ).rejects.toBeInstanceOf(WeatherProviderNotAvailable);
  });

  it("returns the bundle exactly as the provider returns it", async () => {
    const bundle = buildCurrentAndDaily({
      current: { ...buildCurrentAndDaily().current, temperature: 25.5 },
    });
    const openMeteo = buildFakeProvider({ currentAndDaily: bundle });
    const registry = new Map([["open-meteo" as const, openMeteo]]);
    const userPreferencesReader = createInMemoryUserPreferencesReader();

    const useCase = createGetCurrentAndDailyUseCase({ registry, userPreferencesReader });
    const result = await useCase({ userId: "user-1", latitude: 47.5, longitude: 7.5, days: 7 });

    expect(result).toBe(bundle);
  });
});
