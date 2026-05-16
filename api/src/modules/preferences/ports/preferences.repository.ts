import type { UserPreferences, UserPreferencesUpdate } from "@agriwatch/shared";

/**
 * Port: persistence operations the preferences domain needs from the storage
 * layer. Every operation is scoped by `userId` — there is no cross-user
 * read/write path.
 */
export type PreferencesRepository = {
  /**
   * Reads the user's preferences row. Returns `null` if the user has never
   * had preferences persisted (first ever read after signup). The caller
   * is expected to upsert with defaults in that case.
   */
  findByUserId(userId: string): Promise<UserPreferences | null>;

  /**
   * Upserts the preferences row for `userId`. Fields absent from `input`
   * are not touched on an existing row; on insert, fields default to the
   * Prisma defaults (`celsius`, no default site, `open-meteo`).
   */
  upsert(userId: string, input: UserPreferencesUpdate): Promise<UserPreferences>;
};
