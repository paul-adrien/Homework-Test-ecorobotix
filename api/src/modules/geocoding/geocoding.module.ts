import type { FastifyInstance } from "fastify";
import { createNominatimProvider } from "./infrastructure/nominatim.provider.ts";
import { createGeocodingRoutes } from "./interface/geocoding.routes.ts";

/**
 * Composition root for the geocoding module.
 *
 * Today the only provider is Nominatim (OpenStreetMap) — global coverage, free,
 * no API key. The module is structured around the `GeocodingProvider` port so
 * BAN (api-adresse.data.gouv.fr, France-only but address-precise), Open-Meteo
 * search, or a fallback-chain composite could replace it later by changing
 * this one line.
 */
export async function registerGeocodingModule(app: FastifyInstance): Promise<void> {
  const provider = createNominatimProvider();
  await app.register(createGeocodingRoutes({ provider }), { prefix: "/api" });
}
