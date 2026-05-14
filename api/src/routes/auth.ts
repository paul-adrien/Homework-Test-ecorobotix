import { loginSchema, signupSchema, userPublicSchema } from "@agriwatch/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../auth/password.ts";
import { clearSession, getSessionUserId, requireAuth, setSessionUserId } from "../auth/session.ts";
import { prisma } from "../db/client.ts";

const errorResponseSchema = z.object({ error: z.string() });

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/auth/signup",
    {
      schema: {
        tags: ["auth"],
        summary: "Create a new user account and log them in.",
        body: signupSchema,
        response: {
          201: userPublicSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: "An account with this email already exists." });
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          preferences: { create: {} },
        },
      });

      setSessionUserId(request, user.id);

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      });
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
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: "Invalid email or password." });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({ error: "Invalid email or password." });
      }

      setSessionUserId(request, user.id);

      return reply.send({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      });
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
      clearSession(request);
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
      const userId = getSessionUserId(request);
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        clearSession(request);
        return reply.code(401).send({ error: "Unauthorized" });
      }

      return reply.send({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      });
    },
  );
};
