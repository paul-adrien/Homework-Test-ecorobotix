import type { User } from "./domain/user.ts";
import type { PasswordHasher } from "./ports/password-hasher.ts";
import type { UserRepository } from "./ports/user.repository.ts";

/**
 * Test doubles for the `auth` bounded context.
 *
 * Each "fake" is a real implementation of a port — not a mock framework spy. This
 * is the main payoff of the ports/adapters layout: we can swap Prisma for an
 * in-memory Map and bcrypt for a deterministic toy hash, and the use cases work
 * unchanged.
 */

export function buildUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-05-14T08:00:00.000Z");
  return {
    id: "user-1",
    email: "agent@agriwatch.demo",
    passwordHash: "hashed:secret-password",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * In-memory `UserRepository`. Generates auto-incrementing ids and keeps state in a Map.
 */
export function createInMemoryUserRepository(seed: User[] = []): UserRepository {
  const store = new Map<string, User>();
  for (const u of seed) store.set(u.id, u);
  let nextId = seed.length + 1;

  return {
    findById: async (id) => store.get(id) ?? null,

    findByEmail: async (email) => {
      for (const u of store.values()) {
        if (u.email === email) return u;
      }
      return null;
    },

    create: async (input) => {
      const id = `user-${nextId++}`;
      const now = new Date();
      const user: User = {
        id,
        email: input.email,
        passwordHash: input.passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, user);
      return user;
    },
  };
}

/**
 * Deterministic toy hasher: `hashed:<plain>`. Trivially verifiable, no native bcrypt cost.
 */
export function createFakePasswordHasher(): PasswordHasher {
  return {
    hash: async (plain) => `hashed:${plain}`,
    verify: async (plain, hash) => hash === `hashed:${plain}`,
  };
}
