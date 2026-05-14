import { beforeEach, describe, expect, it } from "vitest";
import { buildSite, createInMemorySiteRepository } from "../../test-fakes.ts";
import { createListSitesUseCase } from "../list-sites.usecase.ts";

describe("listSites use case", () => {
  let listSites: ReturnType<typeof createListSitesUseCase>;

  beforeEach(() => {
    const siteRepository = createInMemorySiteRepository([
      buildSite({
        id: "site-a",
        userId: "user-1",
        label: "Earlier",
        createdAt: new Date("2026-05-14T08:00:00.000Z"),
      }),
      buildSite({
        id: "site-b",
        userId: "user-1",
        label: "Later",
        createdAt: new Date("2026-05-14T09:00:00.000Z"),
      }),
      buildSite({ id: "site-c", userId: "user-2", label: "Other user" }),
    ]);
    listSites = createListSitesUseCase({ siteRepository });
  });

  it("returns only the sites owned by the requested user", async () => {
    const sites = await listSites("user-1");

    expect(sites).toHaveLength(2);
    expect(sites.map((s) => s.label).sort()).toEqual(["Earlier", "Later"]);
  });

  it("returns sites ordered by creation date (earliest first)", async () => {
    const sites = await listSites("user-1");

    expect(sites[0]?.label).toBe("Earlier");
    expect(sites[1]?.label).toBe("Later");
  });

  it("returns an empty array when the user has no sites", async () => {
    const sites = await listSites("user-unknown");
    expect(sites).toEqual([]);
  });

  it("strips userId from every returned record", async () => {
    const sites = await listSites("user-1");
    for (const s of sites) expect(s).not.toHaveProperty("userId");
  });
});
