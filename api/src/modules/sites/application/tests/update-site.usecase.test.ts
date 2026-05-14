import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { SiteLabelAlreadyTaken, SiteNotFound } from "../../domain/site.errors.ts";
import { buildSite, createInMemorySiteRepository } from "../../test-fakes.ts";
import { createUpdateSiteUseCase } from "../update-site.usecase.ts";

describe("updateSite use case", () => {
  let updateSite: ReturnType<typeof createUpdateSiteUseCase>;

  beforeEach(() => {
    const siteRepository = createInMemorySiteRepository([
      buildSite({ id: "site-1", userId: "user-1", label: "North field" }),
      buildSite({ id: "site-2", userId: "user-1", label: "South field" }),
      buildSite({ id: "site-3", userId: "user-2", label: "Other user's site" }),
    ]);
    updateSite = createUpdateSiteUseCase({ siteRepository });
  });

  it("updates the provided fields and returns the new state", async () => {
    const updated = await updateSite("user-1", "site-1", {
      label: "Renamed",
      cropType: "barley",
    });

    expect(updated.label).toBe("Renamed");
    expect(updated.cropType).toBe("barley");
  });

  it("leaves untouched fields as they were", async () => {
    const updated = await updateSite("user-1", "site-1", { cropType: "barley" });
    expect(updated.label).toBe("North field");
  });

  it("throws SiteNotFound when the site does not exist", async () => {
    await expect(updateSite("user-1", "missing", { label: "Anything" })).rejects.toBeInstanceOf(
      SiteNotFound,
    );
  });

  it("throws SiteNotFound when the site belongs to another user", async () => {
    await expect(
      updateSite("user-1", "site-3", { label: "Hijack attempt" }),
    ).rejects.toBeInstanceOf(SiteNotFound);
  });

  it("throws SiteLabelAlreadyTaken when renaming to a label the user already uses", async () => {
    await expect(updateSite("user-1", "site-1", { label: "South field" })).rejects.toBeInstanceOf(
      SiteLabelAlreadyTaken,
    );
  });

  it("allows updating with the same label (no-op rename)", async () => {
    const updated = await updateSite("user-1", "site-1", { label: "North field" });
    expect(updated.label).toBe("North field");
  });

  it("rejects invalid coordinates with a Zod error", async () => {
    await expect(updateSite("user-1", "site-1", { latitude: 95 })).rejects.toBeInstanceOf(ZodError);
  });
});
