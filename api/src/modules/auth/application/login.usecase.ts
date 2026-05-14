import { type LoginInput, loginSchema } from "@agriwatch/shared";
import { InvalidCredentials } from "../domain/auth.errors.ts";
import { sanitizeUser, type UserPublic } from "../domain/user.ts";
import type { PasswordHasher } from "../ports/password-hasher.ts";
import type { UserRepository } from "../ports/user.repository.ts";

type Deps = {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
};

export function createLoginUseCase({ userRepository, passwordHasher }: Deps) {
  return async function login(input: LoginInput): Promise<UserPublic> {
    const { email, password } = loginSchema.parse(input);

    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Same error for "user not found" and "wrong password" — avoids leaking user existence.
      throw new InvalidCredentials();
    }

    const valid = await passwordHasher.verify(password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentials();
    }

    return sanitizeUser(user);
  };
}

export type LoginUseCase = ReturnType<typeof createLoginUseCase>;
