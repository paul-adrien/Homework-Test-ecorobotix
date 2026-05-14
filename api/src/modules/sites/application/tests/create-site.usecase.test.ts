import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { SiteLabelAlreadyTaken } from "../../domain/site.errors.ts";
import type { SiteRepository } from "../../ports/site.repository.ts";
import { buildSite, createInMemorySiteRepository } from "../../test-fakes.ts";
import { createCreateSiteUseCase } from "../create-site.usecase.ts";

describe("createSite use case", () => {
  let siteRepository: SiteRepository;
  let createSite: ReturnType<typeof createCreateSiteUseCase>;

  beforeEach(() => {
    siteRepository = createInMemorySiteRepository();
    createSite = createCreateSiteUseCase({ siteRepository });
  });

  const validInput = {
    label: "North field",
    latitude: 46.7785,
    longitude: 6.6411,
    displayName: "Yverdon-les-Bains, Vaud, Switzerland",
    countryCode: "CH",
    timezone: "Europe/Zurich",
    cropType: "wheat",
  };

  it("persists a new site and returns its sanitized projection", async () => {
    const site = await createSite("user-1", validInput);

    expect(site.label).toBe("North field");
    expect(site.latitude).toBe(46.7785);
    expect(site.longitude).toBe(6.6411);
    expect(site.id).toBeDefined();
    expect(site).not.toHaveProperty("userId");
  });

  it("throws SiteLabelAlreadyTaken when the user already has a site with that label", async () => {
    siteRepository = createInMemorySiteRepository([
      buildSite({ userId: "user-1", label: "North field" }),
    ]);
    createSite = createCreateSiteUseCase({ siteRepository });

    await expect(createSite("user-1", validInput)).rejects.toBeInstanceOf(SiteLabelAlreadyTaken);
  });

  it("allows two different users to have the same label", async () => {
    siteRepository = createInMemorySiteRepository([
      buildSite({ userId: "user-1", label: "North field" }),
    ]);
    createSite = createCreateSiteUseCase({ siteRepository });

    const site = await createSite("user-2", validInput);
    expect(site.label).toBe("North field");
  });

  it("rejects invalid coordinates with a Zod error", async () => {
    await expect(createSite("user-1", { ...validInput, latitude: 91 })).rejects.toBeInstanceOf(
      ZodError,
    );
    await expect(createSite("user-1", { ...validInput, longitude: -200 })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("rejects an empty label with a Zod error", async () => {
    await expect(createSite("user-1", { ...validInput, label: "   " })).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});
