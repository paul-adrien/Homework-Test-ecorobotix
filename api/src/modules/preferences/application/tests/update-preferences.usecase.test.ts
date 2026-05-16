import { beforeEach, describe, expect, it } from "vitest";
import { DefaultSiteNotFound } from "../../domain/preferences.errors.ts";
import {
  createFakeSiteOwnershipReader,
  createInMemoryPreferencesRepository,
} from "../../test-fakes.ts";
import { createUpdatePreferencesUseCase } from "../update-preferences.usecase.ts";

describe("updatePreferences use case", () => {
  let preferencesRepository: ReturnType<typeof createInMemoryPreferencesRepository>;

  beforeEach(() => {
    preferencesRepository = createInMemoryPreferencesRepository();
  });

  it("updates only the fields present in the partial input", async () => {
    await preferencesRepository.upsert("user-1", { temperatureUnit: "celsius" });
    const updatePreferences = createUpdatePreferencesUseCase({
      preferencesRepository,
      siteOwnershipReader: createFakeSiteOwnershipReader([]),
    });

    const result = await updatePreferences("user-1", { temperatureUnit: "fahrenheit" });

    expect(result).toEqual({
      temperatureUnit: "fahrenheit",
      defaultSiteId: null,
    });
  });

  it("accepts setting the default site when it belongs to the user", async () => {
    const updatePreferences = createUpdatePreferencesUseCase({
      preferencesRepository,
      siteOwnershipReader: createFakeSiteOwnershipReader([{ siteId: "site-1", userId: "user-1" }]),
    });

    const result = await updatePreferences("user-1", { defaultSiteId: "site-1" });
    expect(result.defaultSiteId).toBe("site-1");
  });

  it("rejects setting the default site to a site the user does not own", async () => {
    const updatePreferences = createUpdatePreferencesUseCase({
      preferencesRepository,
      siteOwnershipReader: createFakeSiteOwnershipReader([{ siteId: "site-1", userId: "user-2" }]),
    });

    await expect(updatePreferences("user-1", { defaultSiteId: "site-1" })).rejects.toBeInstanceOf(
      DefaultSiteNotFound,
    );
  });

  it("rejects setting the default site to a non-existent id", async () => {
    const updatePreferences = createUpdatePreferencesUseCase({
      preferencesRepository,
      siteOwnershipReader: createFakeSiteOwnershipReader([]),
    });

    await expect(updatePreferences("user-1", { defaultSiteId: "ghost" })).rejects.toBeInstanceOf(
      DefaultSiteNotFound,
    );
  });

  it("allows clearing the default site by passing null (no ownership check)", async () => {
    await preferencesRepository.upsert("user-1", { defaultSiteId: "old-site" });
    const updatePreferences = createUpdatePreferencesUseCase({
      preferencesRepository,
      siteOwnershipReader: createFakeSiteOwnershipReader([]),
    });

    const result = await updatePreferences("user-1", { defaultSiteId: null });
    expect(result.defaultSiteId).toBeNull();
  });

  it("leaves unspecified fields unchanged on an existing row", async () => {
    await preferencesRepository.upsert("user-1", { temperatureUnit: "fahrenheit" });
    const updatePreferences = createUpdatePreferencesUseCase({
      preferencesRepository,
      siteOwnershipReader: createFakeSiteOwnershipReader([{ siteId: "site-1", userId: "user-1" }]),
    });

    const result = await updatePreferences("user-1", { defaultSiteId: "site-1" });

    expect(result.temperatureUnit).toBe("fahrenheit");
    expect(result.defaultSiteId).toBe("site-1");
  });
});
