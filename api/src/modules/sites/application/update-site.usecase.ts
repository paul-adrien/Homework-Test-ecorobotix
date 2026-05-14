import { type SiteUpdate, siteUpdateSchema } from "@agriwatch/shared";
import { SiteLabelAlreadyTaken, SiteNotFound } from "../domain/site.errors.ts";
import { type SitePublic, sanitizeSite } from "../domain/site.ts";
import type { SiteRepository } from "../ports/site.repository.ts";

type Deps = {
  siteRepository: SiteRepository;
};

export function createUpdateSiteUseCase({ siteRepository }: Deps) {
  return async function updateSite(
    userId: string,
    siteId: string,
    input: SiteUpdate,
  ): Promise<SitePublic> {
    const parsed = siteUpdateSchema.parse(input);

    const existing = await siteRepository.findByIdForUser(siteId, userId);
    if (!existing) {
      throw new SiteNotFound(siteId);
    }

    // If the user is renaming the site, make sure the new label isn't already used
    // by another of their sites.
    if (parsed.label && parsed.label !== existing.label) {
      const conflict = await siteRepository.findByUserAndLabel(userId, parsed.label);
      if (conflict && conflict.id !== siteId) {
        throw new SiteLabelAlreadyTaken(parsed.label);
      }
    }

    const updated = await siteRepository.update(siteId, userId, parsed);
    return sanitizeSite(updated);
  };
}

export type UpdateSiteUseCase = ReturnType<typeof createUpdateSiteUseCase>;
