import type { WeatherProviderId } from "@agriwatch/shared";
import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { createGetCurrentAndDailyUseCase } from "./application/get-current-and-daily.usecase.ts";
import { createGetHourlyUseCase } from "./application/get-hourly.usecase.ts";
import { createListProvidersUseCase } from "./application/list-providers.usecase.ts";
import type { WeatherProviderRegistry } from "./application/resolve-provider.ts";
import { createCachedProvider } from "./infrastructure/cached-provider.ts";
import { createOpenMeteoProvider } from "./infrastructure/open-meteo.provider.ts";
import { createPrismaUserPreferencesReader } from "./infrastructure/user-preferences-reader.prisma.ts";
import { createWeatherRoutes } from "./interface/weather.routes.ts";
import type { WeatherProvider } from "./ports/weather-provider.ts";

/**
 * Composition root for the `weather` bounded context.
 *
 * Builds the provider registry (Open-Meteo today, Yr.no when the adapter
 * lands), wraps each "cache-naive" provider with the LRU+TTL decorator,
 * injects the registry + Prisma-backed user-preferences reader into the use
 * cases, and registers the routes under `/api`.
 */
export async function registerWeatherModule(
  app: FastifyInstance,
  deps: { prisma: PrismaClient },
): Promise<void> {
  const userPreferencesReader = createPrismaUserPreferencesReader(deps.prisma);

  const registry: WeatherProviderRegistry = new Map<WeatherProviderId, WeatherProvider>([
    ["open-meteo", createCachedProvider(createOpenMeteoProvider())],
  ]);

  const getCurrentAndDailyUseCase = createGetCurrentAndDailyUseCase({
    registry,
    userPreferencesReader,
  });
  const getHourlyUseCase = createGetHourlyUseCase({ registry, userPreferencesReader });
  const listProvidersUseCase = createListProvidersUseCase({ registry });

  await app.register(
    createWeatherRoutes({
      getCurrentAndDailyUseCase,
      getHourlyUseCase,
      listProvidersUseCase,
    }),
    { prefix: "/api" },
  );
}
