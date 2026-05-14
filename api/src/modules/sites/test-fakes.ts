import type { Site } from "./domain/site.ts";
import type { SiteCreateInput, SiteRepository, SiteUpdateInput } from "./ports/site.repository.ts";

export function buildSite(overrides: Partial<Site> = {}): Site {
  const now = new Date("2026-05-14T08:00:00.000Z");
  return {
    id: "site-1",
    userId: "user-1",
    label: "Demo site",
    displayName: "Yverdon-les-Bains, Vaud, Switzerland",
    latitude: 46.7785,
    longitude: 6.6411,
    countryCode: "CH",
    timezone: "Europe/Zurich",
    cropType: "wheat",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * In-memory `SiteRepository`. Generates auto-incrementing ids, stores rows in a
 * Map, and enforces the same `(userId, label)` uniqueness constraint as the DB.
 */
export function createInMemorySiteRepository(seed: Site[] = []): SiteRepository {
  const store = new Map<string, Site>();
  for (const s of seed) store.set(s.id, s);
  let nextId = seed.length + 1;

  function findByUserAndLabel(userId: string, label: string): Site | null {
    for (const s of store.values()) {
      if (s.userId === userId && s.label === label) return s;
    }
    return null;
  }

  return {
    findByIdForUser: async (id, userId) => {
      const s = store.get(id);
      return s?.userId === userId ? s : null;
    },

    findByUserAndLabel: async (userId, label) => findByUserAndLabel(userId, label),

    listByUser: async (userId) =>
      [...store.values()]
        .filter((s) => s.userId === userId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),

    create: async (input: SiteCreateInput) => {
      const id = `site-${nextId++}`;
      const now = new Date();
      const site: Site = {
        id,
        userId: input.userId,
        label: input.label,
        latitude: input.latitude,
        longitude: input.longitude,
        displayName: input.displayName ?? null,
        countryCode: input.countryCode ?? null,
        timezone: input.timezone ?? null,
        cropType: input.cropType ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, site);
      return site;
    },

    update: async (id, userId, input: SiteUpdateInput) => {
      const existing = store.get(id);
      if (existing?.userId !== userId) {
        throw new Error("Site not found");
      }
      const updated: Site = {
        ...existing,
        ...input,
        // partial input might miss optional nullable fields; pass through undefined → keep current
        displayName: input.displayName ?? existing.displayName,
        countryCode: input.countryCode ?? existing.countryCode,
        timezone: input.timezone ?? existing.timezone,
        cropType: input.cropType ?? existing.cropType,
        updatedAt: new Date(),
      };
      store.set(id, updated);
      return updated;
    },

    delete: async (id, userId) => {
      const existing = store.get(id);
      if (existing?.userId !== userId) {
        throw new Error("Site not found");
      }
      store.delete(id);
    },
  };
}
