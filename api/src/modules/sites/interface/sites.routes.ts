import {
  siteCreateSchema,
  sitePublicSchema,
  sitesListSchema,
  siteUpdateSchema,
} from "@agriwatch/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { getCurrentUserIdOrThrow } from "../../auth/interface/current-user.ts";
import { requireAuth } from "../../auth/interface/require-auth.middleware.ts";
import type { CreateSiteUseCase } from "../application/create-site.usecase.ts";
import type { DeleteSiteUseCase } from "../application/delete-site.usecase.ts";
import type { GetSiteUseCase } from "../application/get-site.usecase.ts";
import type { ListSitesUseCase } from "../application/list-sites.usecase.ts";
import type { UpdateSiteUseCase } from "../application/update-site.usecase.ts";
import { SiteLabelAlreadyTaken, SiteNotFound } from "../domain/site.errors.ts";

const errorResponseSchema = z.object({ error: z.string() });
const siteIdParamSchema = z.object({ id: z.string().min(1) });

type Deps = {
  createSiteUseCase: CreateSiteUseCase;
  listSitesUseCase: ListSitesUseCase;
  getSiteUseCase: GetSiteUseCase;
  updateSiteUseCase: UpdateSiteUseCase;
  deleteSiteUseCase: DeleteSiteUseCase;
};

/**
 * HTTP interface adapter for the `sites` bounded context. Every route is guarded
 * by `requireAuth` and scopes its operations to the authenticated user — no
 * route accepts a `userId` in the body or query.
 */
export function createSitesRoutes(deps: Deps): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook("preHandler", requireAuth);

    app.post(
      "/sites",
      {
        schema: {
          tags: ["sites"],
          summary: "Create a new site for the authenticated user.",
          body: siteCreateSchema,
          response: {
            201: sitePublicSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        try {
          const site = await deps.createSiteUseCase(userId, request.body);
          return reply.code(201).send(site);
        } catch (err) {
          if (err instanceof SiteLabelAlreadyTaken) {
            return reply.code(409).send({ error: err.message });
          }
          throw err;
        }
      },
    );

    app.get(
      "/sites",
      {
        schema: {
          tags: ["sites"],
          summary: "List every site owned by the authenticated user.",
          response: { 200: sitesListSchema },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        const sites = await deps.listSitesUseCase(userId);
        return reply.send(sites);
      },
    );

    app.get(
      "/sites/:id",
      {
        schema: {
          tags: ["sites"],
          summary: "Fetch a single site by id.",
          params: siteIdParamSchema,
          response: {
            200: sitePublicSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        try {
          const site = await deps.getSiteUseCase(userId, request.params.id);
          return reply.send(site);
        } catch (err) {
          if (err instanceof SiteNotFound) {
            return reply.code(404).send({ error: err.message });
          }
          throw err;
        }
      },
    );

    app.patch(
      "/sites/:id",
      {
        schema: {
          tags: ["sites"],
          summary: "Update fields of an existing site.",
          params: siteIdParamSchema,
          body: siteUpdateSchema,
          response: {
            200: sitePublicSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        try {
          const site = await deps.updateSiteUseCase(userId, request.params.id, request.body);
          return reply.send(site);
        } catch (err) {
          if (err instanceof SiteNotFound) {
            return reply.code(404).send({ error: err.message });
          }
          if (err instanceof SiteLabelAlreadyTaken) {
            return reply.code(409).send({ error: err.message });
          }
          throw err;
        }
      },
    );

    app.delete(
      "/sites/:id",
      {
        schema: {
          tags: ["sites"],
          summary: "Delete a site. Clears the user's default site if it was this one.",
          params: siteIdParamSchema,
          response: {
            204: z.null(),
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = getCurrentUserIdOrThrow(request);
        try {
          await deps.deleteSiteUseCase(userId, request.params.id);
          return reply.code(204).send(null);
        } catch (err) {
          if (err instanceof SiteNotFound) {
            return reply.code(404).send({ error: err.message });
          }
          throw err;
        }
      },
    );
  };
}
