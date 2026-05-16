import type { PrismaClient } from "@prisma/client";
import type { SiteOwnershipReader } from "../ports/site-ownership-reader.ts";

/**
 * Prisma-backed `SiteOwnershipReader`. A `SELECT 1` against the `Site` table
 * filtered by `(id, userId)` — cheap, indexed on the (userId, label) unique
 * constraint and the primary key.
 */
export function createPrismaSiteOwnershipReader(prisma: PrismaClient): SiteOwnershipReader {
  return {
    async isOwnedByUser(siteId, userId) {
      const row = await prisma.site.findFirst({
        where: { id: siteId, userId },
        select: { id: true },
      });
      return row !== null;
    },
  };
}
