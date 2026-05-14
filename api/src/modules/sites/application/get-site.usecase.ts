import { SiteNotFound } from "../domain/site.errors.ts";
import { type SitePublic, sanitizeSite } from "../domain/site.ts";
import type { SiteRepository } from "../ports/site.repository.ts";

type Deps = {
  siteRepository: SiteRepository;
};

export function createGetSiteUseCase({ siteRepository }: Deps) {
  return async function getSite(userId: string, siteId: string): Promise<SitePublic> {
    const site = await siteRepository.findByIdForUser(siteId, userId);
    if (!site) {
      throw new SiteNotFound(siteId);
    }
    return sanitizeSite(site);
  };
}

export type GetSiteUseCase = ReturnType<typeof createGetSiteUseCase>;
