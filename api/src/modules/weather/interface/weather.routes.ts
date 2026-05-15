import {
  currentAndDailySchema,
  hourlyForecastListSchema,
  hourlyForecastQuerySchema,
  weatherProvidersListSchema,
  weatherQuerySchema,
} from "@agriwatch/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { getCurrentUserIdOrThrow } from "../../auth/interface/current-user.ts";
import { requireAuth } from "../../auth/interface/require-auth.middleware.ts";
import type { GetCurrentAndDailyUseCase } from "../application/get-current-and-daily.usecase.ts";
import type { GetHourlyUseCase } from "../application/get-hourly.usecase.ts";
import type { ListProvidersUseCase } from "../application/list-providers.usecase.ts";
import {
  WeatherProviderFetchFailed,
  WeatherProviderModelNotAvailable,
  WeatherProviderNotAvailable,
} from "../domain/weather.errors.ts";

const errorResponseSchema = z.object({ error: z.string() });

type Deps = {
  getCurrentAndDailyUseCase: GetCurrentAndDailyUseCase;
  getHourlyUseCase: GetHourlyUseCase;
  listProvidersUseCase: ListProvidersUseCase;
};

/**
 * HTTP interface adapter for the `weather` bounded context. Three routes,
 * all behind `requireAuth`:
 *  - `GET /weather` — the bundled dashboard view (current + daily).
 *  - `GET /weather/hourly` — on-demand drill-down for a specific date.
 *  - `GET /weather/providers` — the available providers, used by the
 *    frontend switcher to build its dropdown without hardcoding.
 *
 * Provider-related domain errors are mapped here:
 *  - `WeatherProviderNotAvailable` → 404 (the asked-for provider is not
 *    registered or its `isAvailable()` returned false).
 *  - `WeatherProviderFetchFailed` → 502 (the provider failed upstream;
 *    the client can retry or pick another provider).
 */
export function createWeatherRoutes(deps: Deps): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook("preHandler", requireAuth);

    app.get(
      "/weather",
      {
        schema: {
          tags: ["weather"],
          summary: "Current conditions + multi-day daily forecast for a coordinate.",
          querystring: weatherQuerySchema,
          response: {
            200: currentAndDailySchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            502: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        try {
          const bundle = await deps.getCurrentAndDailyUseCase({
            userId,
            latitude: request.query.lat,
            longitude: request.query.lng,
            days: request.query.days,
            providerId: request.query.provider,
            model: request.query.model,
          });
          return reply.send(bundle);
        } catch (err) {
          if (err instanceof WeatherProviderModelNotAvailable) {
            return reply.code(400).send({ error: err.message });
          }
          if (err instanceof WeatherProviderNotAvailable) {
            return reply.code(404).send({ error: err.message });
          }
          if (err instanceof WeatherProviderFetchFailed) {
            request.log.warn({ err }, "Weather provider fetch failed (current+daily)");
            return reply.code(502).send({ error: err.message });
          }
          throw err;
        }
      },
    );

    app.get(
      "/weather/hourly",
      {
        schema: {
          tags: ["weather"],
          summary: "Hourly forecast for a coordinate on a specific ISO date.",
          querystring: hourlyForecastQuerySchema,
          response: {
            200: hourlyForecastListSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            502: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        try {
          const hours = await deps.getHourlyUseCase({
            userId,
            latitude: request.query.lat,
            longitude: request.query.lng,
            date: request.query.date,
            providerId: request.query.provider,
            model: request.query.model,
          });
          return reply.send(hours);
        } catch (err) {
          if (err instanceof WeatherProviderModelNotAvailable) {
            return reply.code(400).send({ error: err.message });
          }
          if (err instanceof WeatherProviderNotAvailable) {
            return reply.code(404).send({ error: err.message });
          }
          if (err instanceof WeatherProviderFetchFailed) {
            request.log.warn({ err }, "Weather provider fetch failed (hourly)");
            return reply.code(502).send({ error: err.message });
          }
          throw err;
        }
      },
    );

    app.get(
      "/weather/providers",
      {
        schema: {
          tags: ["weather"],
          summary: "List the weather providers currently available on this server.",
          response: { 200: weatherProvidersListSchema },
        },
      },
      async (_request, reply) => {
        return reply.send(deps.listProvidersUseCase());
      },
    );
  };
}
