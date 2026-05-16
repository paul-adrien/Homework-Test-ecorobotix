import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryPreferencesRepository } from "../../test-fakes.ts";
import { createGetPreferencesUseCase } from "../get-preferences.usecase.ts";

describe("getPreferences use case", () => {
  let getPreferences: ReturnType<typeof createGetPreferencesUseCase>;
  let preferencesRepository: ReturnType<typeof createInMemoryPreferencesRepository>;

  beforeEach(() => {
    preferencesRepository = createInMemoryPreferencesRepository();
    getPreferences = createGetPreferencesUseCase({ preferencesRepository });
  });

  it("creates a defaults row on first read so the response is never partial", async () => {
    const result = await getPreferences("user-1");
    expect(result).toEqual({
      temperatureUnit: "celsius",
      defaultSiteId: null,
      preferredProvider: "open-meteo",
    });
  });

  it("returns the existing row on subsequent reads instead of re-creating defaults", async () => {
    await preferencesRepository.upsert("user-1", {
      temperatureUnit: "fahrenheit",
      preferredProvider: "yr-no",
    });
    const result = await getPreferences("user-1");
    expect(result.temperatureUnit).toBe("fahrenheit");
    expect(result.preferredProvider).toBe("yr-no");
  });

  it("scopes reads per user", async () => {
    await preferencesRepository.upsert("user-1", { temperatureUnit: "fahrenheit" });
    const otherUser = await getPreferences("user-2");
    expect(otherUser.temperatureUnit).toBe("celsius");
  });
});
