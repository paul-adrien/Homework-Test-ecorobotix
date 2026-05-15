import { weatherProviderIdSchema } from "@agriwatch/shared";
import type { PrismaClient } from "@prisma/client";
import type { UserPreferencesReader } from "../ports/user-preferences-reader.ts";

/**
 * Prisma-backed read adapter for `UserPreferencesReader`. The
 * `UserPreferences.preferredProvider` column is a plain string in the DB;
 * we validate it through the shared Zod enum on each read so a stale value
 * (e.g. a provider that was removed) is treated as "no preference" rather
 * than crashing the request.
 */
export function createPrismaUserPreferencesReader(prisma: PrismaClient): UserPreferencesReader {
  return {
    async getPreferredProvider(userId) {
      const preferences = await prisma.userPreferences.findUnique({ where: { userId } });
      if (!preferences) return null;
      const parsed = weatherProviderIdSchema.safeParse(preferences.preferredProvider);
      return parsed.success ? parsed.data : null;
    },
  };
}
