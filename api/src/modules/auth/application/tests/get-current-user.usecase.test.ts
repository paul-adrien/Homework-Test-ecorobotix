import { beforeEach, describe, expect, it } from "vitest";
import { Unauthorized } from "../../domain/auth.errors.ts";
import type { UserRepository } from "../../ports/user.repository.ts";
import { buildUser, createInMemoryUserRepository } from "../../test-fakes.ts";
import { createGetCurrentUserUseCase } from "../get-current-user.usecase.ts";

describe("getCurrentUser use case", () => {
  let userRepository: UserRepository;
  let getCurrentUser: ReturnType<typeof createGetCurrentUserUseCase>;

  beforeEach(() => {
    userRepository = createInMemoryUserRepository([
      buildUser({ id: "user-1", email: "agent@agriwatch.demo" }),
    ]);
    getCurrentUser = createGetCurrentUserUseCase({ userRepository });
  });

  it("returns the sanitized user when the id resolves to an existing record", async () => {
    const user = await getCurrentUser("user-1");

    expect(user.id).toBe("user-1");
    expect(user.email).toBe("agent@agriwatch.demo");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("throws Unauthorized when the user id no longer exists (deleted account)", async () => {
    await expect(getCurrentUser("user-does-not-exist")).rejects.toBeInstanceOf(Unauthorized);
  });
});
