import { type SignupInput, signupSchema } from "@agriwatch/shared";
import { EmailAlreadyTaken } from "../domain/auth.errors.ts";
import { sanitizeUser, type UserPublic } from "../domain/user.ts";
import type { PasswordHasher } from "../ports/password-hasher.ts";
import type { UserRepository } from "../ports/user.repository.ts";

type Deps = {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
};

export function createSignupUseCase({ userRepository, passwordHasher }: Deps) {
  return async function signup(input: SignupInput): Promise<UserPublic> {
    const { email, password } = signupSchema.parse(input);

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyTaken(email);
    }

    const passwordHash = await passwordHasher.hash(password);
    const user = await userRepository.create({ email, passwordHash });

    return sanitizeUser(user);
  };
}

export type SignupUseCase = ReturnType<typeof createSignupUseCase>;
