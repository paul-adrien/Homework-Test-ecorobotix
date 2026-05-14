import bcrypt from "bcrypt";
import type { PasswordHasher } from "../ports/password-hasher.ts";

const BCRYPT_WORK_FACTOR = 12;

/**
 * Bcrypt adapter for the `PasswordHasher` port.
 * Work factor 12 = ~250ms per hash on a modern machine, the current industry sweet spot.
 */
export function createBcryptPasswordHasher(): PasswordHasher {
  return {
    hash: (plain) => bcrypt.hash(plain, BCRYPT_WORK_FACTOR),
    verify: (plain, hash) => bcrypt.compare(plain, hash),
  };
}
