import type { CurrentAndDaily, WeatherProviderId } from "@agriwatch/shared";
import {
  assertModelAvailable,
  resolveProvider,
  type WeatherProviderRegistry,
} from "./resolve-provider.ts";

type Deps = {
  registry: WeatherProviderRegistry;
};

export type GetCurrentAndDailyInput = Readonly<{
  latitude: number;
  longitude: number;
  days: number;
  providerId?: WeatherProviderId;
  model?: string;
}>;

/**
 * Use case behind `GET /api/weather`. Resolves the provider (request param
 * → fallback), validates the requested model against the provider's
 * exposed `models`, then asks for the current+daily bundle.
 */
export function createGetCurrentAndDailyUseCase({ registry }: Deps) {
  return async function getCurrentAndDaily(
    input: GetCurrentAndDailyInput,
  ): Promise<CurrentAndDaily> {
    const provider = resolveProvider(registry, input.providerId);
    assertModelAvailable(provider, input.model);
    return provider.getCurrentAndDaily(input.latitude, input.longitude, input.days, {
      model: input.model,
    });
  };
}

export type GetCurrentAndDailyUseCase = ReturnType<typeof createGetCurrentAndDailyUseCase>;
