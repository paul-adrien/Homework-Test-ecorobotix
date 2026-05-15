import type { WeatherProviderInfo } from "@agriwatch/shared";
import type { WeatherProviderRegistry } from "./resolve-provider.ts";

type Deps = {
  registry: WeatherProviderRegistry;
};

/**
 * Use case behind `GET /api/weather/providers`. Returns only the registered
 * providers that report `isAvailable()` — keyed providers whose env var is
 * absent are omitted so the frontend switcher hides them rather than
 * showing greyed-out items the user can't activate.
 */
export function createListProvidersUseCase({ registry }: Deps) {
  return function listProviders(): WeatherProviderInfo[] {
    return [...registry.values()]
      .filter((provider) => provider.isAvailable())
      .map((provider) => ({
        id: provider.id,
        displayName: provider.displayName,
        requiresApiKey: provider.requiresApiKey,
        ...(provider.models ? { models: [...provider.models] } : {}),
      }));
  };
}

export type ListProvidersUseCase = ReturnType<typeof createListProvidersUseCase>;
