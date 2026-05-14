import type { PrismaClient } from "@prisma/client";
import type { Site } from "../domain/site.ts";
import type { SiteCreateInput, SiteRepository, SiteUpdateInput } from "../ports/site.repository.ts";

/**
 * Prisma adapter for the `SiteRepository` port. Every operation is scoped by
 * `userId` to prevent cross-tenant access.
 */
export function createPrismaSiteRepository(prisma: PrismaClient): SiteRepository {
  return {
    findByIdForUser: (id, userId) => prisma.site.findFirst({ where: { id, userId } }),

    findByUserAndLabel: (userId, label) =>
      prisma.site.findUnique({ where: { userId_label: { userId, label } } }),

    listByUser: (userId) =>
      prisma.site.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),

    create: async (input: SiteCreateInput): Promise<Site> => {
      return prisma.site.create({
        data: {
          userId: input.userId,
          label: input.label,
          latitude: input.latitude,
          longitude: input.longitude,
          displayName: input.displayName,
          countryCode: input.countryCode,
          timezone: input.timezone,
          cropType: input.cropType,
        },
      });
    },

    update: async (id, userId, input: SiteUpdateInput): Promise<Site> => {
      // Compound where uses a scoped update — Prisma's `updateMany` would not return
      // the updated row, so we go through a guarded `update` that targets the unique
      // id. The use case has already verified ownership before calling this.
      return prisma.site.update({
        where: { id, userId },
        data: input,
      });
    },

    delete: async (id, userId) => {
      await prisma.site.delete({ where: { id, userId } });
    },
  };
}
