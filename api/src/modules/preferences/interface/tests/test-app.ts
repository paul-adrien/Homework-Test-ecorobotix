import type { FastifyInstance } from "fastify";
import { buildBaseTestApp } from "../../../../shared/test/test-app.ts";
import type { GetPreferencesUseCase } from "../../application/get-preferences.usecase.ts";
import type { UpdatePreferencesUseCase } from "../../application/update-preferences.usecase.ts";
import { createPreferencesRoutes } from "../preferences.routes.ts";

type Deps = {
  getPreferencesUseCase: GetPreferencesUseCase;
  updatePreferencesUseCase: UpdatePreferencesUseCase;
};

export async function buildTestApp(deps: Deps): Promise<FastifyInstance> {
  const app = await buildBaseTestApp();
  await app.register(createPreferencesRoutes(deps), { prefix: "/api" });
  return app;
}
