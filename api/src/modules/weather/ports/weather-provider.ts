import type {
  CurrentWeather,
  DailyForecast,
  GeocodingResult,
  HourlyForecast,
  WeatherProviderId,
} from "@agriwatch/shared";

/**
 * Port: a weather data source. Each adapter under `infrastructure/` is
 * responsible for fetching from its upstream API and mapping the raw response
 * to the unified shared types — the use cases above (and the HTTP routes)
 * never see provider-specific shapes.
 *
 * `isAvailable()` is evaluated eagerly at startup for keyed providers (so
 * `GET /api/weather/providers` can omit unavailable ones). It is not called
 * on the hot path of every request.
 *
 * `getGeocoding` is optional: the `geocoding` bounded context owns address
 * search via Nominatim today, but the hook is kept on the interface so a
 * future provider that ships its own geocoding (Open-Meteo, OpenWeatherMap)
 * can plug in without changing the contract.
 */
export interface WeatherProvider {
  readonly id: WeatherProviderId;
  readonly displayName: string;
  readonly requiresApiKey: boolean;
  isAvailable(): boolean;

  getCurrent(latitude: number, longitude: number): Promise<CurrentWeather>;
  getDailyForecast(latitude: number, longitude: number, days: number): Promise<DailyForecast[]>;
  getHourlyForecast(
    latitude: number,
    longitude: number,
    isoDate: string,
  ): Promise<HourlyForecast[]>;
  getGeocoding?(query: string): Promise<GeocodingResult[]>;
}
