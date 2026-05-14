import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { InvalidCredentials } from "../../domain/auth.errors.ts";
import type { PasswordHasher } from "../../ports/password-hasher.ts";
import type { UserRepository } from "../../ports/user.repository.ts";
import {
  buildUser,
  createFakePasswordHasher,
  createInMemoryUserRepository,
} from "../../test-fakes.ts";
import { createLoginUseCase } from "../login.usecase.ts";

describe("login use case", () => {
  let userRepository: UserRepository;
  let passwordHasher: PasswordHasher;
  let login: ReturnType<typeof createLoginUseCase>;

  beforeEach(() => {
    userRepository = createInMemoryUserRepository([
      buildUser({
        id: "user-1",
        email: "agent@agriwatch.demo",
        passwordHash: "hashed:correct-password",
      }),
    ]);
    passwordHasher = createFakePasswordHasher();
    login = createLoginUseCase({ userRepository, passwordHasher });
  });

  it("returns the sanitized user when credentials are valid", async () => {
    const user = await login({ email: "agent@agriwatch.demo", password: "correct-password" });

    expect(user.id).toBe("user-1");
    expect(user.email).toBe("agent@agriwatch.demo");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("normalises the email (trim + lowercase) before lookup", async () => {
    const user = await login({ email: "  AGENT@AgriWatch.DEMO  ", password: "correct-password" });

    expect(user.id).toBe("user-1");
  });

  it("throws InvalidCredentials when the email does not exist", async () => {
    await expect(
      login({ email: "unknown@example.com", password: "correct-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentials);
  });

  it("throws InvalidCredentials when the password is wrong", async () => {
    await expect(
      login({ email: "agent@agriwatch.demo", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentials);
  });

  it("returns the same InvalidCredentials error for unknown email and wrong password", async () => {
    // Defense against user-enumeration attacks: both cases must surface the same error.
    const unknownEmail = await login({
      email: "unknown@example.com",
      password: "whatever",
    }).catch((e) => e);
    const wrongPassword = await login({
      email: "agent@agriwatch.demo",
      password: "wrong-password",
    }).catch((e) => e);

    expect(unknownEmail).toBeInstanceOf(InvalidCredentials);
    expect(wrongPassword).toBeInstanceOf(InvalidCredentials);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });

  it("rejects an empty password with a Zod validation error", async () => {
    await expect(login({ email: "agent@agriwatch.demo", password: "" })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("rejects an invalid email with a Zod validation error", async () => {
    await expect(
      login({ email: "not-an-email", password: "correct-password" }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
