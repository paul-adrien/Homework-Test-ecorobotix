import { createHash } from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import fastifySecureSession from "@fastify/secure-session";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { GetCurrentUserUseCase } from "../../application/get-current-user.usecase.ts";
import type { LoginUseCase } from "../../application/login.usecase.ts";
import type { SignupUseCase } from "../../application/signup.usecase.ts";
import { createAuthRoutes } from "../auth.routes.ts";

type Deps = {
  signupUseCase: SignupUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
};

/**
 * Build an in-memory Fastify app wired with the same plugins the production server uses
 * (cookie, secure-session, Zod type provider) but with the auth use cases injected as
 * mocks. Lets HTTP integration tests run without a database or any network.
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

  await app.register(createAuthRoutes(deps), { prefix: "/api" });

  return app;
}
