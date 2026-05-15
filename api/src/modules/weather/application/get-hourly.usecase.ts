import type { HourlyForecast, WeatherProviderId } from "@agriwatch/shared";
import type { UserPreferencesReader } from "../ports/user-preferences-reader.ts";
import { resolveProvider, type WeatherProviderRegistry } from "./resolve-provider.ts";

type Deps = {
  registry: WeatherProviderRegistry;
  userPreferencesReader: UserPreferencesReader;
};

export type GetHourlyInput = Readonly<{
  userId: string;
  latitude: number;
  longitude: number;
  date: string;
  providerId?: WeatherProviderId;
}>;

/**
 * Use case behind `GET /api/weather/hourly`. Resolves the provider the same
 * way as the bundle endpoint, then asks for the hourly forecast on a given
 * day — typically the date the user just tapped on the daily chart.
 */
export function createGetHourlyUseCase({ registry, userPreferencesReader }: Deps) {
  return async function getHourly(input: GetHourlyInput): Promise<HourlyForecast[]> {
    const provider = await resolveProvider(
      registry,
      userPreferencesReader,
      input.userId,
      input.providerId,
    );
    return provider.getHourly(input.latitude, input.longitude, input.date);
  };
}

export type GetHourlyUseCase = ReturnType<typeof createGetHourlyUseCase>;
