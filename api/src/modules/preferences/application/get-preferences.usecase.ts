import type { UserPreferences } from "@agriwatch/shared";
import type { PreferencesRepository } from "../ports/preferences.repository.ts";

type Deps = {
  preferencesRepository: PreferencesRepository;
};

/**
 * Returns the user's preferences. The API contract promises a complete blob
 * (never partial), so when a user has no row yet — typically right after
 * signup — we upsert one with the schema's defaults and return it. That
 * way the frontend can always trust the response shape and doesn't need a
 * "first-call" branch.
 */
export function createGetPreferencesUseCase({ preferencesRepository }: Deps) {
  return async function getPreferences(userId: string): Promise<UserPreferences> {
    const existing = await preferencesRepository.findByUserId(userId);
    if (existing) return existing;
    return preferencesRepository.upsert(userId, {});
  };
}

export type GetPreferencesUseCase = ReturnType<typeof createGetPreferencesUseCase>;
