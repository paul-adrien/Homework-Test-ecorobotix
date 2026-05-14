import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { createCreateSiteUseCase } from "./application/create-site.usecase.ts";
import { createDeleteSiteUseCase } from "./application/delete-site.usecase.ts";
import { createGetSiteUseCase } from "./application/get-site.usecase.ts";
import { createListSitesUseCase } from "./application/list-sites.usecase.ts";
import { createUpdateSiteUseCase } from "./application/update-site.usecase.ts";
import { createPrismaSiteRepository } from "./infrastructure/site.repository.prisma.ts";
import { createSitesRoutes } from "./interface/sites.routes.ts";

/**
 * Composition root for the `sites` bounded context. Builds the Prisma adapter,
 * injects it into every use case, and registers the routes on the Fastify app
 * under `/api`.
 */
export async function registerSitesModule(
  app: FastifyInstance,
  deps: { prisma: PrismaClient },
): Promise<void> {
  const siteRepository = createPrismaSiteRepository(deps.prisma);

  const createSiteUseCase = createCreateSiteUseCase({ siteRepository });
  const listSitesUseCase = createListSitesUseCase({ siteRepository });
  const getSiteUseCase = createGetSiteUseCase({ siteRepository });
  const updateSiteUseCase = createUpdateSiteUseCase({ siteRepository });
  const deleteSiteUseCase = createDeleteSiteUseCase({ siteRepository });

  await app.register(
    createSitesRoutes({
      createSiteUseCase,
      listSitesUseCase,
      getSiteUseCase,
      updateSiteUseCase,
      deleteSiteUseCase,
    }),
    { prefix: "/api" },
  );
}
