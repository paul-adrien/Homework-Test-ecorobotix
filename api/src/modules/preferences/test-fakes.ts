import type { UserPreferences, UserPreferencesUpdate } from "@agriwatch/shared";
import type { PreferencesRepository } from "./ports/preferences.repository.ts";
import type { SiteOwnershipReader } from "./ports/site-ownership-reader.ts";

const DEFAULTS: UserPreferences = {
  temperatureUnit: "celsius",
  defaultSiteId: null,
  preferredProvider: "open-meteo",
};

/**
 * In-memory `PreferencesRepository` for tests. Persists per-user blobs in a
 * Map. Matches the Prisma adapter's "first read returns defaults via upsert"
 * shape: callers should run the same `findByUserId → upsert with {}` flow
 * the real use case does.
 */
export function createInMemoryPreferencesRepository(): PreferencesRepository {
  const store = new Map<string, UserPreferences>();
  return {
    async findByUserId(userId) {
      return store.get(userId) ?? null;
    },
    async upsert(userId, input) {
      const current = store.get(userId) ?? DEFAULTS;
      const next: UserPreferences = {
        temperatureUnit: input.temperatureUnit ?? current.temperatureUnit,
        defaultSiteId:
          input.defaultSiteId === undefined ? current.defaultSiteId : input.defaultSiteId,
        preferredProvider: input.preferredProvider ?? current.preferredProvider,
      };
      store.set(userId, next);
      return next;
    },
  };
}

/**
 * Fake `SiteOwnershipReader` backed by a static `(siteId, userId)` set.
 * Tests load it with the pairs they want to consider "valid" and any other
 * combination resolves to `false`.
 */
export function createFakeSiteOwnershipReader(
  owned: ReadonlyArray<{ siteId: string; userId: string }>,
): SiteOwnershipReader {
  const keys = new Set(owned.map((o) => `${o.userId}:${o.siteId}`));
  return {
    async isOwnedByUser(siteId, userId) {
      return keys.has(`${userId}:${siteId}`);
    },
  };
}

export type InMemoryPreferencesRepository = ReturnType<typeof createInMemoryPreferencesRepository>;

/**
 * Tiny stub for tests that want to assert what arguments the upsert was
 * called with without caring about persistence. Wraps an in-memory repo.
 */
export function spyPreferencesRepository(): {
  repo: PreferencesRepository;
  calls: Array<{ userId: string; input: UserPreferencesUpdate }>;
} {
  const inner = createInMemoryPreferencesRepository();
  const calls: Array<{ userId: string; input: UserPreferencesUpdate }> = [];
  return {
    calls,
    repo: {
      findByUserId: inner.findByUserId,
      upsert: async (userId, input) => {
        calls.push({ userId, input });
        return inner.upsert(userId, input);
      },
    },
  };
}
