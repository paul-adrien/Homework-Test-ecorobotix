import type { WeatherProviderId } from "@agriwatch/shared";
import {
  WeatherProviderModelNotAvailable,
  WeatherProviderNotAvailable,
} from "../domain/weather.errors.ts";
import type { WeatherProvider } from "../ports/weather-provider.ts";

export type WeatherProviderRegistry = ReadonlyMap<WeatherProviderId, WeatherProvider>;

export const FALLBACK_PROVIDER_ID: WeatherProviderId = "open-meteo";

/**
 * Picks the provider to use for a request, in priority order:
 *  1. The `providerId` pinned by the request (`?provider=...`).
 *  2. The hard-coded fallback (`open-meteo`).
 *
 * The chosen provider must exist in the registry AND report `isAvailable()`
 * — otherwise we raise `WeatherProviderNotAvailable` so the HTTP layer can
 * map it to 404. Falling through to another provider silently would mask a
 * misconfiguration.
 */
export function resolveProvider(
  registry: WeatherProviderRegistry,
  requestedProviderId: WeatherProviderId | undefined,
): WeatherProvider {
  const providerId = requestedProviderId ?? FALLBACK_PROVIDER_ID;
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
