import type { FastifyInstance } from "fastify";
import { buildBaseTestApp } from "../../../../shared/test/test-app.ts";
import type { GeocodingProvider } from "../../ports/geocoding.provider.ts";
import { createGeocodingRoutes } from "../geocoding.routes.ts";

export async function buildTestApp(provider: GeocodingProvider): Promise<FastifyInstance> {
  const app = await buildBaseTestApp();
  await app.register(createGeocodingRoutes({ provider }), { prefix: "/api" });
  return app;
}
