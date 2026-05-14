import { type SiteCreate, siteCreateSchema } from "@agriwatch/shared";
import { SiteLabelAlreadyTaken } from "../domain/site.errors.ts";
import { type SitePublic, sanitizeSite } from "../domain/site.ts";
import type { SiteRepository } from "../ports/site.repository.ts";

type Deps = {
  siteRepository: SiteRepository;
};

export function createCreateSiteUseCase({ siteRepository }: Deps) {
  return async function createSite(userId: string, input: SiteCreate): Promise<SitePublic> {
    const parsed = siteCreateSchema.parse(input);

    const existing = await siteRepository.findByUserAndLabel(userId, parsed.label);
    if (existing) {
      throw new SiteLabelAlreadyTaken(parsed.label);
    }

    const site = await siteRepository.create({
      userId,
      label: parsed.label,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      displayName: parsed.displayName,
      countryCode: parsed.countryCode,
      timezone: parsed.timezone,
      cropType: parsed.cropType,
    });

    return sanitizeSite(site);
  };
}

export type CreateSiteUseCase = ReturnType<typeof createCreateSiteUseCase>;
