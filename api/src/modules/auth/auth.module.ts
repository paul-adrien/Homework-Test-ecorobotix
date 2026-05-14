import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { createGetCurrentUserUseCase } from "./application/get-current-user.usecase.ts";
import { createLoginUseCase } from "./application/login.usecase.ts";
import { createSignupUseCase } from "./application/signup.usecase.ts";
import { createBcryptPasswordHasher } from "./infrastructure/password-hasher.bcrypt.ts";
import { createPrismaUserRepository } from "./infrastructure/user.repository.prisma.ts";
import { createAuthRoutes } from "./interface/auth.routes.ts";

/**
 * Composition root for the `auth` bounded context.
 *
 * Builds the adapters, wires them into the use cases, and registers the HTTP
 * routes on the Fastify app under `/api`. The `server.ts` bootstrap only needs
 * to call this single function — all auth wiring is local to the module.
 */
export async function registerAuthModule(
  app: FastifyInstance,
  deps: { prisma: PrismaClient },
): Promise<void> {
  const userRepository = createPrismaUserRepository(deps.prisma);
  const passwordHasher = createBcryptPasswordHasher();

  const signupUseCase = createSignupUseCase({ userRepository, passwordHasher });
  const loginUseCase = createLoginUseCase({ userRepository, passwordHasher });
  const getCurrentUserUseCase = createGetCurrentUserUseCase({ userRepository });

  await app.register(createAuthRoutes({ signupUseCase, loginUseCase, getCurrentUserUseCase }), {
    prefix: "/api",
  });
}
