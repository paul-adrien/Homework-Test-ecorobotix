import { describe, expect, it } from "vitest";
import {
  WeatherProviderModelNotAvailable,
  WeatherProviderNotAvailable,
} from "../../domain/weather.errors.ts";
import { buildCurrentAndDaily, buildFakeProvider } from "../../test-fakes.ts";
import { createGetCurrentAndDailyUseCase } from "../get-current-and-daily.usecase.ts";

describe("getCurrentAndDaily use case", () => {
  it("uses the provider pinned by the request when present", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const yrNo = buildFakeProvider({ id: "yr-no" });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);

    const useCase = createGetCurrentAndDailyUseCase({ registry });
    await useCase({
      latitude: 47.5,
      longitude: 7.5,
      days: 7,
      providerId: "yr-no",
    });

    expect(yrNo.spies.getCurrentAndDaily).toHaveBeenCalledTimes(1);
    expect(openMeteo.spies.getCurrentAndDaily).not.toHaveBeenCalled();
  });

  it("falls back to open-meteo when the request does not pin a provider", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const yrNo = buildFakeProvider({ id: "yr-no" });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);

    const useCase = createGetCurrentAndDailyUseCase({ registry });
    await useCase({ latitude: 47.5, longitude: 7.5, days: 7 });

    expect(openMeteo.spies.getCurrentAndDaily).toHaveBeenCalledWith(47.5, 7.5, 7, {
      model: undefined,
    });
    expect(yrNo.spies.getCurrentAndDaily).not.toHaveBeenCalled();
  });

  it("throws WeatherProviderNotAvailable when the requested provider is not registered", async () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo" });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetCurrentAndDailyUseCase({ registry });

    await expect(
      useCase({
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

    const useCase = createGetCurrentAndDailyUseCase({ registry });

    await expect(useCase({ latitude: 47.5, longitude: 7.5, days: 7 })).rejects.toBeInstanceOf(
      WeatherProviderNotAvailable,
    );
  });

  it("forwards a valid `model` to the provider when the provider exposes that model", async () => {
    const openMeteo = buildFakeProvider({
      id: "open-meteo",
      models: [
        { id: "best_match", displayName: "Best match" },
        { id: "ecmwf_ifs025", displayName: "ECMWF" },
      ],
    });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetCurrentAndDailyUseCase({ registry });
    await useCase({
      latitude: 47.5,
      longitude: 7.5,
      days: 7,
      model: "ecmwf_ifs025",
    });

    expect(openMeteo.spies.getCurrentAndDaily).toHaveBeenCalledWith(47.5, 7.5, 7, {
      model: "ecmwf_ifs025",
    });
  });

  it("throws WeatherProviderModelNotAvailable when the model is not in the provider's list", async () => {
    const openMeteo = buildFakeProvider({
      id: "open-meteo",
      models: [{ id: "best_match", displayName: "Best match" }],
    });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetCurrentAndDailyUseCase({ registry });

    await expect(
      useCase({
        latitude: 47.5,
        longitude: 7.5,
        days: 7,
        model: "unknown_model",
      }),
    ).rejects.toBeInstanceOf(WeatherProviderModelNotAvailable);
    expect(openMeteo.spies.getCurrentAndDaily).not.toHaveBeenCalled();
  });

  it("throws WeatherProviderModelNotAvailable when the resolved provider exposes no models at all", async () => {
    // Yr.no in production exposes no `models` field — asking for one is a
    // client mistake, not a silent no-op.
    const yrNo = buildFakeProvider({ id: "yr-no" });
    const registry = new Map([["yr-no" as const, yrNo]]);

    const useCase = createGetCurrentAndDailyUseCase({ registry });

    await expect(
      useCase({
        latitude: 47.5,
        longitude: 7.5,
        days: 7,
        providerId: "yr-no",
        model: "ecmwf_ifs025",
      }),
    ).rejects.toBeInstanceOf(WeatherProviderModelNotAvailable);
  });

  it("returns the bundle exactly as the provider returns it", async () => {
    const bundle = buildCurrentAndDaily({
      current: { ...buildCurrentAndDaily().current, temperature: 25.5 },
    });
    const openMeteo = buildFakeProvider({ currentAndDaily: bundle });
    const registry = new Map([["open-meteo" as const, openMeteo]]);

    const useCase = createGetCurrentAndDailyUseCase({ registry });
    const result = await useCase({ latitude: 47.5, longitude: 7.5, days: 7 });

    expect(result).toBe(bundle);
  });
});
