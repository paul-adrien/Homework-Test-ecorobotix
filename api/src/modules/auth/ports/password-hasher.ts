/**
 * Port: password hashing operations.
 * Implementations live in `infrastructure/` (e.g., `password-hasher.bcrypt.ts`).
 */
export type PasswordHasher = {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
};
