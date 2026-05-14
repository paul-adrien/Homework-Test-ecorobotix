import { createHash } from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import fastifySecureSession from "@fastify/secure-session";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
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

/**
 * Build an in-memory Fastify app wired with the same plugins the production
 * server uses (cookie, secure-session, Zod type provider). The sites routes
 * are registered with mocked use cases so HTTP tests can run without a DB.
 */
export async function buildTestApp(deps: Deps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyCookie);
  await app.register(fastifySecureSession, {
    key: createHash("sha256").update("test-secret-at-least-32-chars-long").digest(),
    cookie: {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  });

  await app.register(createSitesRoutes(deps), { prefix: "/api" });

  return app;
}

/**
 * Forges a session cookie value that authenticates as the given user. Uses
 * the same approach as a real login (we boot a tiny route that sets the
 * session, fire a request, and read the resulting cookie) so the cookie is
 * properly encrypted with the test key.
 */
export async function makeSessionCookieFor(userId: string): Promise<string> {
  const app = Fastify({ logger: false });
  await app.register(fastifyCookie);
  await app.register(fastifySecureSession, {
    key: createHash("sha256").update("test-secret-at-least-32-chars-long").digest(),
    cookie: {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  });
  app.post("/__sign-in", async (request, reply) => {
    request.session.set("userId", userId);
    return reply.code(204).send(null);
  });

  const res = await app.inject({ method: "POST", url: "/__sign-in" });
  const cookie = res.cookies.find((c) => c.name === "session")?.value;
  await app.close();
  if (!cookie) throw new Error("Failed to issue test session cookie");
  return cookie;
}
