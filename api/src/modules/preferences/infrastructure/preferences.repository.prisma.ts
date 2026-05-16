import {
  type TemperatureUnit,
  temperatureUnitSchema,
  type UserPreferences,
  type WeatherProviderId,
  weatherProviderIdSchema,
} from "@agriwatch/shared";
import type { PrismaClient } from "@prisma/client";
import type { PreferencesRepository } from "../ports/preferences.repository.ts";

/**
 * Prisma-backed `PreferencesRepository`. The DB stores `temperatureUnit` and
 * `preferredProvider` as plain strings — we validate through the shared Zod
 * enums on each read so a stale value (e.g. a removed provider id, or an
 * unknown unit) coerces back to its default rather than crashing the route.
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
          ...(input.preferredProvider ? { preferredProvider: input.preferredProvider } : {}),
        },
        update: {
          ...(input.temperatureUnit ? { temperatureUnit: input.temperatureUnit } : {}),
          ...(input.defaultSiteId === undefined ? {} : { defaultSiteId: input.defaultSiteId }),
          ...(input.preferredProvider ? { preferredProvider: input.preferredProvider } : {}),
        },
      });
      return toDomain(row);
    },
  };
}

type Row = {
  temperatureUnit: string;
  defaultSiteId: string | null;
  preferredProvider: string;
};

function toDomain(row: Row): UserPreferences {
  const temperatureUnit: TemperatureUnit =
    temperatureUnitSchema.safeParse(row.temperatureUnit).data ?? "celsius";
  const preferredProvider: WeatherProviderId =
    weatherProviderIdSchema.safeParse(row.preferredProvider).data ?? "open-meteo";
  return {
    temperatureUnit,
    defaultSiteId: row.defaultSiteId,
    preferredProvider,
  };
}
