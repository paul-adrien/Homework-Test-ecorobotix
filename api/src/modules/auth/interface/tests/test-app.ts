import type { FastifyInstance } from "fastify";
import { buildBaseTestApp } from "../../../../shared/test/test-app.ts";
import type { GetCurrentUserUseCase } from "../../application/get-current-user.usecase.ts";
import type { LoginUseCase } from "../../application/login.usecase.ts";
import type { SignupUseCase } from "../../application/signup.usecase.ts";
import { createAuthRoutes } from "../auth.routes.ts";

type Deps = {
  signupUseCase: SignupUseCase;
  loginUseCase: LoginUseCase;
  getCurrentUserUseCase: GetCurrentUserUseCase;
};

export async function buildTestApp(deps: Deps): Promise<FastifyInstance> {
  const app = await buildBaseTestApp();
  await app.register(createAuthRoutes(deps), { prefix: "/api" });
  return app;
}
