import { beforeEach, describe, expect, it } from "vitest";
import { SiteNotFound } from "../../domain/site.errors.ts";
import type { SiteRepository } from "../../ports/site.repository.ts";
import { buildSite, createInMemorySiteRepository } from "../../test-fakes.ts";
import { createDeleteSiteUseCase } from "../delete-site.usecase.ts";

describe("deleteSite use case", () => {
  let siteRepository: SiteRepository;
  let deleteSite: ReturnType<typeof createDeleteSiteUseCase>;

  beforeEach(() => {
    siteRepository = createInMemorySiteRepository([
      buildSite({ id: "site-1", userId: "user-1" }),
      buildSite({ id: "site-2", userId: "user-2" }),
    ]);
    deleteSite = createDeleteSiteUseCase({ siteRepository });
  });

  it("removes the site from the repository when the owner asks", async () => {
    await deleteSite("user-1", "site-1");
    expect(await siteRepository.findByIdForUser("site-1", "user-1")).toBeNull();
  });

  it("throws SiteNotFound when the site does not exist", async () => {
    await expect(deleteSite("user-1", "missing")).rejects.toBeInstanceOf(SiteNotFound);
  });

  it("throws SiteNotFound when the site belongs to another user", async () => {
    await expect(deleteSite("user-1", "site-2")).rejects.toBeInstanceOf(SiteNotFound);
    // and the other user's site is still there
    expect(await siteRepository.findByIdForUser("site-2", "user-2")).not.toBeNull();
  });
});
