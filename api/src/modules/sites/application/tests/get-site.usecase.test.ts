import { beforeEach, describe, expect, it } from "vitest";
import { SiteNotFound } from "../../domain/site.errors.ts";
import { buildSite, createInMemorySiteRepository } from "../../test-fakes.ts";
import { createGetSiteUseCase } from "../get-site.usecase.ts";

describe("getSite use case", () => {
  let getSite: ReturnType<typeof createGetSiteUseCase>;

  beforeEach(() => {
    const siteRepository = createInMemorySiteRepository([
      buildSite({ id: "site-1", userId: "user-1", label: "Mine" }),
      buildSite({ id: "site-2", userId: "user-2", label: "Someone else" }),
    ]);
    getSite = createGetSiteUseCase({ siteRepository });
  });

  it("returns the site when the id and owner match", async () => {
    const site = await getSite("user-1", "site-1");
    expect(site.id).toBe("site-1");
    expect(site.label).toBe("Mine");
  });

  it("throws SiteNotFound when the site does not exist", async () => {
    await expect(getSite("user-1", "site-missing")).rejects.toBeInstanceOf(SiteNotFound);
  });

  it("throws SiteNotFound when the site exists but belongs to another user (no IDOR)", async () => {
    await expect(getSite("user-1", "site-2")).rejects.toBeInstanceOf(SiteNotFound);
  });
});
