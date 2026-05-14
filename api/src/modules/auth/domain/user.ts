import { type UserPublic, userPublicSchema } from "@agriwatch/shared";

export type { UserPublic };

/**
 * Domain `User` entity — a registered field agent.
 *
 * Declared locally (not imported from `@prisma/client`) on purpose: the domain layer
 * must not depend on the infrastructure (DDD dependency inversion). Prisma is one
 * implementation of persistence; if we ever swap ORMs (Drizzle, Kysely, raw SQL,
 * an in-memory store for tests) the domain stays untouched.
 */
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Sanitize a `User` into its public projection — what may safely leave the server.
 *
 * Runs through `userPublicSchema.parse` so the runtime *strips* any field that isn't
 * explicitly declared as public. Defense in depth against accidentally leaking
 * `passwordHash` (or future-added sensitive fields): even if a caller spreads the
 * full entity into the response, Zod removes anything not on the allowlist.
 */
export function sanitizeUser(user: User): UserPublic {
  return userPublicSchema.parse({
    ...user,
    createdAt: user.createdAt.toISOString(),
  });
}
