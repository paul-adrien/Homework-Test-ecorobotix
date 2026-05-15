import type { FastifyInstance } from "fastify";
import { buildBaseTestApp } from "../../../../shared/test/test-app.ts";
import type { GetCurrentAndDailyUseCase } from "../../application/get-current-and-daily.usecase.ts";
import type { GetHourlyUseCase } from "../../application/get-hourly.usecase.ts";
import type { ListProvidersUseCase } from "../../application/list-providers.usecase.ts";
import { createWeatherRoutes } from "../weather.routes.ts";

type Deps = {
  getCurrentAndDailyUseCase: GetCurrentAndDailyUseCase;
  getHourlyUseCase: GetHourlyUseCase;
  listProvidersUseCase: ListProvidersUseCase;
};

export async function buildTestApp(deps: Deps): Promise<FastifyInstance> {
  const app = await buildBaseTestApp();
  await app.register(createWeatherRoutes(deps), { prefix: "/api" });
  return app;
}
