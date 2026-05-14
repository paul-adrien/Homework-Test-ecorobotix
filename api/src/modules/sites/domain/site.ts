import { type SitePublic, sitePublicSchema } from "@agriwatch/shared";
import type { Site } from "@prisma/client";

/**
 * Re-export Prisma's generated `Site` as the canonical domain type. Other
 * modules import `Site` from this file so the rest of the codebase never
 * reaches into `@prisma/client` directly — if we ever swap ORMs we only
 * update this one import.
 */
export type { Site, SitePublic };

/**
 * Sanitize a `Site` into its public projection — what may safely leave the server.
 *
 * Goes through `sitePublicSchema.parse` so the runtime strips anything not on the
 * allowlist (currently the `userId` foreign key) and ISO-serialises the timestamps.
 * Defence in depth against accidentally leaking ownership information.
 */
export function sanitizeSite(site: Site): SitePublic {
  return sitePublicSchema.parse({
    ...site,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  });
}
