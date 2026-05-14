import type { User } from "../domain/user.ts";

/**
 * Port: persistence operations the `auth` domain needs from the storage layer.
 * Implementations live in `infrastructure/` (e.g., `user.repository.prisma.ts`).
 */
export type UserRepository = {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: { email: string; passwordHash: string }): Promise<User>;
};
