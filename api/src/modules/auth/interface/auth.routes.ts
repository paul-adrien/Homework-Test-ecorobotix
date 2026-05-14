import { loginSchema, signupSchema, userPublicSchema } from "@agriwatch/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { GetCurrentUserUseCase } from "../application/get-current-user.usecase.ts";
import type { LoginUseCase } from "../application/login.usecase.ts";
import type { SignupUseCase } from "../application/signup.usecase.ts";
import { EmailAlreadyTaken } from "../domain/auth.errors.ts";
import { fastifySessionStore } from "../infrastructure/session-store.fastify.ts";
import { requireAuth } from "./require-auth.middleware.ts";

const errorResponseSchema = z.object({ error: z.string() });

type Deps = {
  signupUseCase: SignupUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
};

/**
 * HTTP interface adapter for the `auth` bounded context.
 *
 * Each handler is a thin translator: parse the incoming request body (Zod schema
 * shared with the frontend), invoke the appropriate use case, then turn the
 * result — or a domain error — into the right HTTP response.
 */
export function createAuthRoutes(deps: Deps): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      "/auth/signup",
      {
        schema: {
          tags: ["auth"],
          summary: "Create a new account and log in.",
          body: signupSchema,
          response: {
            201: userPublicSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const user = await deps.signupUseCase(request.body);
          fastifySessionStore.setUserId(request, user.id);
          return reply.code(201).send(user);
        } catch (err) {
          if (err instanceof EmailAlreadyTaken) {
            return reply.code(409).send({ error: err.message });
          }
          throw err;
        }
      },
    );

    app.post(
      "/auth/login",
      {
        schema: {
          tags: ["auth"],
          summary: "Authenticate with email and password, set the session cookie.",
          body: loginSchema,
          response: {
            200: userPublicSchema,
            401: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const user = await deps.loginUseCase(request.body);
          fastifySessionStore.setUserId(request, user.id);
          return reply.send(user);
        } catch {
          return reply.code(401).send({ error: "Invalid email or password." });
        }
      },
    );

    app.post(
      "/auth/logout",
      {
        schema: {
          tags: ["auth"],
          summary: "Clear the session cookie.",
          response: { 204: z.null() },
        },
      },
      async (request, reply) => {
        fastifySessionStore.clear(request);
        return reply.code(204).send(null);
      },
    );

    app.get(
      "/auth/me",
      {
        preHandler: requireAuth,
        schema: {
          tags: ["auth"],
          summary: "Return the currently authenticated user.",
          response: {
            200: userPublicSchema,
            401: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = fastifySessionStore.getUserId(request);
        if (!userId) {
          return reply.code(401).send({ error: "Unauthorized" });
        }

        try {
          const user = await deps.getCurrentUserUseCase(userId);
          return reply.send(user);
        } catch {
          fastifySessionStore.clear(request);
          return reply.code(401).send({ error: "Unauthorized" });
        }
      },
    );
  };
}
