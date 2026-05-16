import { userPreferencesSchema, userPreferencesUpdateSchema } from "@agriwatch/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { getCurrentUserIdOrThrow } from "../../auth/interface/current-user.ts";
import { requireAuth } from "../../auth/interface/require-auth.middleware.ts";
import type { GetPreferencesUseCase } from "../application/get-preferences.usecase.ts";
import type { UpdatePreferencesUseCase } from "../application/update-preferences.usecase.ts";
import { DefaultSiteNotFound } from "../domain/preferences.errors.ts";

const errorResponseSchema = z.object({ error: z.string() });

type Deps = {
  getPreferencesUseCase: GetPreferencesUseCase;
  updatePreferencesUseCase: UpdatePreferencesUseCase;
};

/**
 * HTTP interface for the `preferences` bounded context. Two routes under
 * `/api/me/preferences` — both behind `requireAuth`, both scoped to the
 * authenticated user (no `userId` in body/query).
 */
export function createPreferencesRoutes(deps: Deps): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook("preHandler", requireAuth);

    app.get(
      "/me/preferences",
      {
        schema: {
          tags: ["preferences"],
          summary:
            "Fetch the authenticated user's preferences. Creates a default row on first call.",
          response: { 200: userPreferencesSchema },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        const preferences = await deps.getPreferencesUseCase(userId);
        return reply.send(preferences);
      },
    );

    app.patch(
      "/me/preferences",
      {
        schema: {
          tags: ["preferences"],
          summary:
            "Update one or more preference fields. Missing fields are left unchanged; setting `defaultSiteId` to null clears the default.",
          body: userPreferencesUpdateSchema,
          response: {
            200: userPreferencesSchema,
            400: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        try {
          const preferences = await deps.updatePreferencesUseCase(userId, request.body);
          return reply.send(preferences);
        } catch (err) {
          if (err instanceof DefaultSiteNotFound) {
            return reply.code(400).send({ error: err.message });
          }
          throw err;
        }
      },
    );
  };
}
