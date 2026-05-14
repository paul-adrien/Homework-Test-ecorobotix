import { Unauthorized } from "../domain/auth.errors.ts";
import { sanitizeUser, type UserPublic } from "../domain/user.ts";
import type { UserRepository } from "../ports/user.repository.ts";

type Deps = {
  userRepository: UserRepository;
};

export function createGetCurrentUserUseCase({ userRepository }: Deps) {
  return async function getCurrentUser(userId: string): Promise<UserPublic> {
    const user = await userRepository.findById(userId);
    if (!user) {
      // The session referenced a user that no longer exists (deleted account).
      throw new Unauthorized();
    }
    return sanitizeUser(user);
  };
}

export type GetCurrentUserUseCase = ReturnType<typeof createGetCurrentUserUseCase>;
