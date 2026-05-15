import { createHash } from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import fastifySecureSession from "@fastify/secure-session";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

const TEST_SESSION_SECRET = "test-secret-at-least-32-chars-long";

const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7,
} as const;

/**
 * Build a logger-less Fastify app wired with the same baseline plugins the
 * production server uses (cookie, secure-session, Zod type provider). The
 * caller is responsible for registering the routes under test on top — keeping
 * this helper module-agnostic shrinks every module's local test-app to a
 * thin wrapper that just plugs its own routes in.
 */
export async function buildBaseTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyCookie);
  await app.register(fastifySecureSession, {
    key: createHash("sha256").update(TEST_SESSION_SECRET).digest(),
    cookie: cookieOptions,
  });

  return app;
}

/**
 * Forges an encrypted session cookie that authenticates as the given user,
 * so a route guarded by `requireAuth` accepts the injected request. Spins a
 * tiny throwaway app, sets the session via a synthetic route, reads back the
 * resulting cookie, and closes the app — guaranteed to be in sync with our
 * session encryption setup because it goes through the same plugin.
 */
export async function makeSessionCookieFor(userId: string): Promise<string> {
  const app = Fastify({ logger: false });
  await app.register(fastifyCookie);
  await app.register(fastifySecureSession, {
    key: createHash("sha256").update(TEST_SESSION_SECRET).digest(),
    cookie: cookieOptions,
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
