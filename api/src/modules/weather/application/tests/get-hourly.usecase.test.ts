import { describe, expect, it } from "vitest";
import {
  WeatherProviderModelNotAvailable,
  WeatherProviderNotAvailable,
} from "../../domain/weather.errors.ts";
import { buildFakeProvider, buildHourlyForecast } from "../../test-fakes.ts";
import { createGetHourlyUseCase } from "../get-hourly.usecase.ts";

describe("getHourly use case", () => {
  it("forwards the latitude, longitude and date to the resolved provider", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetHourlyUseCase({ registry });
    await useCase({ latitude: 47.5, longitude: 7.5, date: "2026-05-20" });

    expect(openMeteo.spies.getHourly).toHaveBeenCalledWith(47.5, 7.5, "2026-05-20", {
      model: undefined,
    });
  });

  it("falls back to open-meteo when the request does not pin a provider", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const yrNo = buildFakeProvider({ id: "yr-no" });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);

    const useCase = createGetHourlyUseCase({ registry });
    await useCase({ latitude: 47.5, longitude: 7.5, date: "2026-05-20" });

    expect(openMeteo.spies.getHourly).toHaveBeenCalledTimes(1);
    expect(yrNo.spies.getHourly).not.toHaveBeenCalled();
  });

  it("throws WeatherProviderNotAvailable when the resolved provider is unknown", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetHourlyUseCase({ registry });

    await expect(
      useCase({
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
      models: [{ id: "ecmwf_ifs025", displayName: "ECMWF" }],
    });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetHourlyUseCase({ registry });
    await useCase({
      latitude: 47.5,
      longitude: 7.5,
      date: "2026-05-20",
      model: "ecmwf_ifs025",
    });

    expect(openMeteo.spies.getHourly).toHaveBeenCalledWith(47.5, 7.5, "2026-05-20", {
      model: "ecmwf_ifs025",
    });
  });

  it("throws WeatherProviderModelNotAvailable when the model is unknown", async () => {
    const openMeteo = buildFakeProvider({
      id: "open-meteo",
      models: [{ id: "best_match", displayName: "Best match" }],
    });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetHourlyUseCase({ registry });

    await expect(
      useCase({
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

    const useCase = createGetHourlyUseCase({ registry });
    const result = await useCase({ latitude: 47.5, longitude: 7.5, date: "2026-05-20" });

    expect(result).toBe(hourly);
  });
});
