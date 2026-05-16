import type { HourlyForecast, WeatherProviderId } from "@agriwatch/shared";
import {
  assertModelAvailable,
  resolveProvider,
  type WeatherProviderRegistry,
} from "./resolve-provider.ts";

type Deps = {
  registry: WeatherProviderRegistry;
};

export type GetHourlyInput = Readonly<{
  latitude: number;
  longitude: number;
  date: string;
  providerId?: WeatherProviderId;
  model?: string;
}>;

/**
 * Use case behind `GET /api/weather/hourly`. Resolves the provider the same
 * way as the bundle endpoint, validates the model, then asks for the hourly
 * forecast on a given day — typically the date the user just tapped on the
 * daily chart.
 */
export function createGetHourlyUseCase({ registry }: Deps) {
  return async function getHourly(input: GetHourlyInput): Promise<HourlyForecast[]> {
    const provider = resolveProvider(registry, input.providerId);
    assertModelAvailable(provider, input.model);
    return provider.getHourly(input.latitude, input.longitude, input.date, {
      model: input.model,
    });
  };
}

export type GetHourlyUseCase = ReturnType<typeof createGetHourlyUseCase>;
