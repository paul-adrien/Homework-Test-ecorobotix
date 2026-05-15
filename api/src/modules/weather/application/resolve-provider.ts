import type { WeatherProviderId } from "@agriwatch/shared";
import {
  WeatherProviderModelNotAvailable,
  WeatherProviderNotAvailable,
} from "../domain/weather.errors.ts";
import type { UserPreferencesReader } from "../ports/user-preferences-reader.ts";
import type { WeatherProvider } from "../ports/weather-provider.ts";

export type WeatherProviderRegistry = ReadonlyMap<WeatherProviderId, WeatherProvider>;

export const FALLBACK_PROVIDER_ID: WeatherProviderId = "open-meteo";

/**
 * Picks the provider to use for a request, in priority order:
 *  1. The `providerId` pinned by the request (`?provider=...`).
 *  2. The user's stored preferred provider.
 *  3. The hard-coded fallback (`open-meteo`).
 *
 * The chosen provider must exist in the registry AND report `isAvailable()`
 * — otherwise we raise `WeatherProviderNotAvailable` so the HTTP layer can
 * map it to 404. Falling through to another provider silently would mask a
 * misconfiguration.
 */
export async function resolveProvider(
  registry: WeatherProviderRegistry,
  userPreferencesReader: UserPreferencesReader,
  userId: string,
  requestedProviderId: WeatherProviderId | undefined,
): Promise<WeatherProvider> {
  const providerId =
    requestedProviderId ??
    (await userPreferencesReader.getPreferredProvider(userId)) ??
    FALLBACK_PROVIDER_ID;

  const provider = registry.get(providerId);
  if (!provider?.isAvailable()) {
    throw new WeatherProviderNotAvailable(providerId);
  }
  return provider;
}

/**
 * Validates that a caller-supplied `modelId` is actually exposed by the
 * resolved provider. A provider without a `models` array rejects any
 * non-empty `modelId` (asking for a model on a fixed-blend source is a
 * client mistake, not a no-op).
 */
export function assertModelAvailable(provider: WeatherProvider, modelId: string | undefined): void {
  if (!modelId) return;
  if (!provider.models?.some((m) => m.id === modelId)) {
    throw new WeatherProviderModelNotAvailable(provider.id, modelId);
  }
}
