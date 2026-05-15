import { describe, expect, it } from "vitest";
import { buildFakeProvider } from "../../test-fakes.ts";
import { createListProvidersUseCase } from "../list-providers.usecase.ts";

describe("listProviders use case", () => {
  it("returns the public-facing info for every available provider", () => {
    const openMeteo = buildFakeProvider({
      id: "open-meteo",
      displayName: "Open-Meteo",
      requiresApiKey: false,
    });
    const yrNo = buildFakeProvider({
      id: "yr-no",
      displayName: "Yr.no (Met.no)",
      requiresApiKey: false,
    });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);

    const useCase = createListProvidersUseCase({ registry });
    const result = useCase();

    expect(result).toEqual([
      { id: "open-meteo", displayName: "Open-Meteo", requiresApiKey: false },
      { id: "yr-no", displayName: "Yr.no (Met.no)", requiresApiKey: false },
    ]);
  });

  it("omits providers whose isAvailable() returns false", () => {
    const openMeteo = buildFakeProvider({ id: "open-meteo", isAvailable: true });
    const yrNo = buildFakeProvider({ id: "yr-no", isAvailable: false });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);

    const useCase = createListProvidersUseCase({ registry });
    const result = useCase();

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("open-meteo");
  });

  it("returns an empty array when no provider is registered", () => {
    const useCase = createListProvidersUseCase({ registry: new Map() });
    expect(useCase()).toEqual([]);
  });

  it("includes a provider's `models` list when present, and omits the field otherwise", () => {
    const openMeteo = buildFakeProvider({
      id: "open-meteo",
      displayName: "Open-Meteo",
      models: [
        { id: "best_match", displayName: "Best match" },
        { id: "ecmwf_ifs04", displayName: "ECMWF" },
      ],
    });
    const yrNo = buildFakeProvider({ id: "yr-no", displayName: "Yr.no" });
    const registry = new Map([
      ["open-meteo" as const, openMeteo],
      ["yr-no" as const, yrNo],
    ]);

    const result = createListProvidersUseCase({ registry })();

    expect(result[0]?.models).toEqual([
      { id: "best_match", displayName: "Best match" },
      { id: "ecmwf_ifs04", displayName: "ECMWF" },
    ]);
    expect(result[1]?.models).toBeUndefined();
  });
});
