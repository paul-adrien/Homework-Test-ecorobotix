import type { CurrentAndDaily, WeatherProviderId } from "@agriwatch/shared";
import type { UserPreferencesReader } from "../ports/user-preferences-reader.ts";
import { resolveProvider, type WeatherProviderRegistry } from "./resolve-provider.ts";

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
}>;

/**
 * Use case behind `GET /api/weather`. Resolves the provider (request param
 * → user preference → fallback), then asks it for the current+daily bundle.
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
    return provider.getCurrentAndDaily(input.latitude, input.longitude, input.days);
  };
}

export type GetCurrentAndDailyUseCase = ReturnType<typeof createGetCurrentAndDailyUseCase>;
