import type { FastifyInstance } from "fastify";
import { buildBaseTestApp } from "../../../../shared/test/test-app.ts";
import type { CreateSiteUseCase } from "../../application/create-site.usecase.ts";
import type { DeleteSiteUseCase } from "../../application/delete-site.usecase.ts";
import type { GetSiteUseCase } from "../../application/get-site.usecase.ts";
import type { ListSitesUseCase } from "../../application/list-sites.usecase.ts";
import type { UpdateSiteUseCase } from "../../application/update-site.usecase.ts";
import { createSitesRoutes } from "../sites.routes.ts";

type Deps = {
  createSiteUseCase: CreateSiteUseCase;
  listSitesUseCase: ListSitesUseCase;
  getSiteUseCase: GetSiteUseCase;
  updateSiteUseCase: UpdateSiteUseCase;
  deleteSiteUseCase: DeleteSiteUseCase;
};

export async function buildTestApp(deps: Deps): Promise<FastifyInstance> {
  const app = await buildBaseTestApp();
  await app.register(createSitesRoutes(deps), { prefix: "/api" });
  return app;
}
