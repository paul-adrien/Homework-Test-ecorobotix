import type { PrismaClient } from "@prisma/client";
import type { User } from "../domain/user.ts";
import type { UserRepository } from "../ports/user.repository.ts";

/**
 * Prisma adapter for the `UserRepository` port.
 *
 * On `create`, also provisions an empty `UserPreferences` row in the same
 * transaction so a newly registered user always has the related record present
 * (avoids null checks throughout the rest of the app).
 */
export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    create: async (input): Promise<User> => {
      return prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          preferences: { create: {} },
        },
      });
    },
  };
}
