import type { UserPreferences, UserPreferencesUpdate } from "@agriwatch/shared";
import { DefaultSiteNotFound } from "../domain/preferences.errors.ts";
import type { PreferencesRepository } from "../ports/preferences.repository.ts";
import type { SiteOwnershipReader } from "../ports/site-ownership-reader.ts";

type Deps = {
  preferencesRepository: PreferencesRepository;
  siteOwnershipReader: SiteOwnershipReader;
};

/**
 * Partially update the user's preferences. Validates the optional
 * `defaultSiteId` against site ownership before the write so we surface a
 * clean 400 rather than letting the Prisma FK throw a 500.
 *
 * Passing `defaultSiteId: null` clears the default; passing `undefined`
 * (omitting the field) leaves it unchanged.
 */
export function createUpdatePreferencesUseCase({
  preferencesRepository,
  siteOwnershipReader,
}: Deps) {
  return async function updatePreferences(
    userId: string,
    input: UserPreferencesUpdate,
  ): Promise<UserPreferences> {
    if (typeof input.defaultSiteId === "string") {
      const owned = await siteOwnershipReader.isOwnedByUser(input.defaultSiteId, userId);
      if (!owned) throw new DefaultSiteNotFound(input.defaultSiteId);
    }
    return preferencesRepository.upsert(userId, input);
  };
}

export type UpdatePreferencesUseCase = ReturnType<typeof createUpdatePreferencesUseCase>;
