import type { CurrentAndDaily, WeatherProviderId } from "@agriwatch/shared";
import type { UserPreferencesReader } from "../ports/user-preferences-reader.ts";
import {
  assertModelAvailable,
  resolveProvider,
  type WeatherProviderRegistry,
} from "./resolve-provider.ts";

type Deps = {
  registry: WeatherProviderRegistry;
  userPreferencesReader: UserPreferencesReader;
};

export type GetCurrentAndDailyInput = Readonly<{
  userId: string;
  latitude: number;
  longitude: number;
  days: number;
  providerId?: WeatherProviderId;
  model?: string;
}>;

/**
 * Use case behind `GET /api/weather`. Resolves the provider (request param
 * → user preference → fallback), validates the requested model against the
 * provider's exposed `models`, then asks for the current+daily bundle.
 */
export function createGetCurrentAndDailyUseCase({ registry, userPreferencesReader }: Deps) {
  return async function getCurrentAndDaily(
    input: GetCurrentAndDailyInput,
  ): Promise<CurrentAndDaily> {
    const provider = await resolveProvider(
      registry,
      userPreferencesReader,
      input.userId,
      input.providerId,
    );
    assertModelAvailable(provider, input.model);
    return provider.getCurrentAndDaily(input.latitude, input.longitude, input.days, {
      model: input.model,
    });
  };
}

export type GetCurrentAndDailyUseCase = ReturnType<typeof createGetCurrentAndDailyUseCase>;
