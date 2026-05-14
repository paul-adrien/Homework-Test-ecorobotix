import { createHash } from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import fastifySecureSession from "@fastify/secure-session";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { GeocodingProvider } from "../../ports/geocoding.provider.ts";
import { createGeocodingRoutes } from "../geocoding.routes.ts";

const TEST_SECRET = "test-secret-at-least-32-chars-long";

export async function buildTestApp(provider: GeocodingProvider): Promise<FastifyInstance> {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyCookie);
  await app.register(fastifySecureSession, {
    key: createHash("sha256").update(TEST_SECRET).digest(),
    cookie: {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  });

  await app.register(createGeocodingRoutes({ provider }), { prefix: "/api" });
  return app;
}

/**
 * Issue an encrypted session cookie that authenticates as the given user, so
 * the geocoding routes' `requireAuth` preHandler accepts the request.
 */
export async function makeSessionCookieFor(userId: string): Promise<string> {
  const app = Fastify({ logger: false });
  await app.register(fastifyCookie);
  await app.register(fastifySecureSession, {
    key: createHash("sha256").update(TEST_SECRET).digest(),
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
