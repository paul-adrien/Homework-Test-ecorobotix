import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { createGetPreferencesUseCase } from "./application/get-preferences.usecase.ts";
import { createUpdatePreferencesUseCase } from "./application/update-preferences.usecase.ts";
import { createPrismaPreferencesRepository } from "./infrastructure/preferences.repository.prisma.ts";
import { createPrismaSiteOwnershipReader } from "./infrastructure/site-ownership-reader.prisma.ts";
import { createPreferencesRoutes } from "./interface/preferences.routes.ts";

/**
 * Composition root for the `preferences` bounded context. Wires the Prisma
 * adapters into the use cases and registers the routes under `/api`.
 */
export async function registerPreferencesModule(
  app: FastifyInstance,
  deps: { prisma: PrismaClient },
): Promise<void> {
  const preferencesRepository = createPrismaPreferencesRepository(deps.prisma);
  const siteOwnershipReader = createPrismaSiteOwnershipReader(deps.prisma);

  const getPreferencesUseCase = createGetPreferencesUseCase({ preferencesRepository });
  const updatePreferencesUseCase = createUpdatePreferencesUseCase({
    preferencesRepository,
    siteOwnershipReader,
  });

  await app.register(createPreferencesRoutes({ getPreferencesUseCase, updatePreferencesUseCase }), {
    prefix: "/api",
  });
}
