import { type SitePublic, sanitizeSite } from "../domain/site.ts";
import type { SiteRepository } from "../ports/site.repository.ts";

type Deps = {
  siteRepository: SiteRepository;
};

export function createListSitesUseCase({ siteRepository }: Deps) {
  return async function listSites(userId: string): Promise<SitePublic[]> {
    const sites = await siteRepository.listByUser(userId);
    return sites.map(sanitizeSite);
  };
}

export type ListSitesUseCase = ReturnType<typeof createListSitesUseCase>;
