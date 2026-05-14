import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { EmailAlreadyTaken } from "../../domain/auth.errors.ts";
import type { PasswordHasher } from "../../ports/password-hasher.ts";
import type { UserRepository } from "../../ports/user.repository.ts";
import {
  buildUser,
  createFakePasswordHasher,
  createInMemoryUserRepository,
} from "../../test-fakes.ts";
import { createSignupUseCase } from "../signup.usecase.ts";

describe("signup use case", () => {
  let userRepository: UserRepository;
  let passwordHasher: PasswordHasher;
  let signup: ReturnType<typeof createSignupUseCase>;

  beforeEach(() => {
    userRepository = createInMemoryUserRepository();
    passwordHasher = createFakePasswordHasher();
    signup = createSignupUseCase({ userRepository, passwordHasher });
  });

  it("creates a new user and returns the sanitized projection", async () => {
    const user = await signup({ email: "new@example.com", password: "strong-password-123" });

    expect(user.email).toBe("new@example.com");
    expect(user.id).toBeDefined();
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("stores the password hashed, never in plain text", async () => {
    await signup({ email: "new@example.com", password: "strong-password-123" });

    const persisted = await userRepository.findByEmail("new@example.com");
    expect(persisted).not.toBeNull();
    expect(persisted?.passwordHash).toBe("hashed:strong-password-123");
    expect(persisted?.passwordHash).not.toBe("strong-password-123");
  });

  it("normalises the email (trim + lowercase) before persisting", async () => {
    await signup({ email: "  AGENT@Example.COM  ", password: "strong-password-123" });

    const persisted = await userRepository.findByEmail("agent@example.com");
    expect(persisted).not.toBeNull();
  });

  it("throws EmailAlreadyTaken when the email is already registered", async () => {
    userRepository = createInMemoryUserRepository([buildUser({ email: "taken@example.com" })]);
    signup = createSignupUseCase({ userRepository, passwordHasher });

    await expect(
      signup({ email: "taken@example.com", password: "strong-password-123" }),
    ).rejects.toBeInstanceOf(EmailAlreadyTaken);
  });

  it("rejects an invalid email with a Zod validation error", async () => {
    await expect(
      signup({ email: "not-an-email", password: "strong-password-123" }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a password shorter than the minimum (12 chars) with a Zod validation error", async () => {
    await expect(signup({ email: "new@example.com", password: "short" })).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});
