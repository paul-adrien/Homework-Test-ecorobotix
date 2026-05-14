import { SiteNotFound } from "../domain/site.errors.ts";
import type { SiteRepository } from "../ports/site.repository.ts";

type Deps = {
  siteRepository: SiteRepository;
};

/**
 * Deletes a site owned by the given user. If the site was the user's default
 * (referenced by `UserPreferences.defaultSiteId`), the FK's `ON DELETE SET NULL`
 * constraint clears the reference automatically at the database level.
 */
export function createDeleteSiteUseCase({ siteRepository }: Deps) {
  return async function deleteSite(userId: string, siteId: string): Promise<void> {
    const existing = await siteRepository.findByIdForUser(siteId, userId);
    if (!existing) {
      throw new SiteNotFound(siteId);
    }
    await siteRepository.delete(siteId, userId);
  };
}

export type DeleteSiteUseCase = ReturnType<typeof createDeleteSiteUseCase>;
