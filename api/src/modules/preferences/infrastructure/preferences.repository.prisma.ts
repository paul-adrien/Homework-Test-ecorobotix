import {
  type TemperatureUnit,
  temperatureUnitSchema,
  type UserPreferences,
} from "@agriwatch/shared";
import type { PrismaClient } from "@prisma/client";
import type { PreferencesRepository } from "../ports/preferences.repository.ts";

/**
 * Prisma-backed `PreferencesRepository`. The DB stores `temperatureUnit` as
 * a plain string — we validate through the shared Zod enum on each read so a
 * stale value (e.g. an unknown unit) coerces back to the default rather
 * than crashing the route.
 */
export function createPrismaPreferencesRepository(prisma: PrismaClient): PreferencesRepository {
  return {
    async findByUserId(userId) {
      const row = await prisma.userPreferences.findUnique({ where: { userId } });
      return row ? toDomain(row) : null;
    },

    async upsert(userId, input) {
      const row = await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          ...(input.temperatureUnit ? { temperatureUnit: input.temperatureUnit } : {}),
          ...(input.defaultSiteId === undefined ? {} : { defaultSiteId: input.defaultSiteId }),
        },
        update: {
          ...(input.temperatureUnit ? { temperatureUnit: input.temperatureUnit } : {}),
          ...(input.defaultSiteId === undefined ? {} : { defaultSiteId: input.defaultSiteId }),
        },
      });
      return toDomain(row);
    },
  };
}

type Row = {
  temperatureUnit: string;
  defaultSiteId: string | null;
};

function toDomain(row: Row): UserPreferences {
  const temperatureUnit: TemperatureUnit =
    temperatureUnitSchema.safeParse(row.temperatureUnit).data ?? "celsius";
  return {
    temperatureUnit,
    defaultSiteId: row.defaultSiteId,
  };
}
