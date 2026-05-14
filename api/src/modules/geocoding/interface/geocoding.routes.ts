import { geocodingResultSchema, geocodingSearchResponseSchema } from "@agriwatch/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireAuth } from "../../auth/interface/require-auth.middleware.ts";
import type { GeocodingProvider } from "../ports/geocoding.provider.ts";

const errorResponseSchema = z.object({ error: z.string() });

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Query is required").max(200),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const reverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

type Deps = {
  provider: GeocodingProvider;
};

/**
 * HTTP interface for the geocoding module. Two endpoints, both behind
 * `requireAuth` so the proxy can't be abused by anonymous traffic.
 */
export function createGeocodingRoutes(deps: Deps): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook("preHandler", requireAuth);

    app.get(
      "/geocoding/search",
      {
        schema: {
          tags: ["geocoding"],
          summary: "Forward geocoding — find locations matching the query.",
          querystring: searchQuerySchema,
          response: {
            200: geocodingSearchResponseSchema,
            502: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const results = await deps.provider.search(request.query.q, {
            limit: request.query.limit,
          });
          return reply.send(results);
        } catch (err) {
          request.log.warn({ err }, "Geocoding search failed");
          return reply.code(502).send({ error: "Geocoding service unavailable. Try again later." });
        }
      },
    );

    app.get(
      "/geocoding/reverse",
      {
        schema: {
          tags: ["geocoding"],
          summary: "Reverse geocoding — find the location matching given coordinates.",
          querystring: reverseQuerySchema,
          response: {
            200: geocodingResultSchema,
            404: errorResponseSchema,
            502: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const result = await deps.provider.reverse(request.query.lat, request.query.lng);
          if (!result) {
            return reply.code(404).send({ error: "No location found at these coordinates." });
          }
          return reply.send(result);
        } catch (err) {
          request.log.warn({ err }, "Geocoding reverse failed");
          return reply.code(502).send({ error: "Geocoding service unavailable. Try again later." });
        }
      },
    );
  };
}
