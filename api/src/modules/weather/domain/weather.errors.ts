import type { WeatherProviderId } from "@agriwatch/shared";

/**
 * Thrown when the caller asks for a provider that is not registered or whose
 * `isAvailable()` returns false (typically a keyed provider with a missing
 * env var). Mapped to HTTP 404 at the interface boundary.
 */
export class WeatherProviderNotAvailable extends Error {
  constructor(public readonly providerId: WeatherProviderId | string) {
    super(`Weather provider not available: ${providerId}`);
    this.name = "WeatherProviderNotAvailable";
  }
}

/**
 * Thrown when a provider call fails (network error, non-2xx response,
 * malformed payload). Mapped to HTTP 502 at the interface boundary so the
 * client can retry or pick another provider.
 */
export class WeatherProviderFetchFailed extends Error {
  constructor(
    public readonly providerId: WeatherProviderId | string,
    cause: string,
  ) {
    super(`Weather provider ${providerId} failed: ${cause}`);
    this.name = "WeatherProviderFetchFailed";
  }
}

/**
 * Thrown when the caller asks for a model that the provider does not expose
 * (or asks for a model on a provider that doesn't support model selection
 * at all). Mapped to HTTP 400 at the interface boundary — it's invalid input,
 * not a transient upstream failure.
 */
export class WeatherProviderModelNotAvailable extends Error {
  constructor(
    public readonly providerId: WeatherProviderId | string,
    public readonly modelId: string,
  ) {
    super(`Provider ${providerId} does not expose model "${modelId}"`);
    this.name = "WeatherProviderModelNotAvailable";
  }
}
