import type { WeatherProviderId } from "@agriwatch/shared";

/**
 * Read-only port the weather module uses to look up a user's preferred
 * provider when the HTTP request does not pin one via `?provider=`. Defined
 * inside the weather bounded context (rather than in a `preferences/` module
 * that does not exist yet) because that's exactly the slice the use cases
 * need — Phase 5 will spawn a full `preferences` module with write paths and
 * either implement this port from there or replace it cleanly.
 */
export interface UserPreferencesReader {
  /**
   * Returns the user's stored preferred provider, or `null` when there is no
   * preferences row OR the stored value is no longer a valid provider id
   * (e.g. the provider was removed from the schema). The caller is expected
   * to fall back to a server-side default in either case.
   */
  getPreferredProvider(userId: string): Promise<WeatherProviderId | null>;
}
