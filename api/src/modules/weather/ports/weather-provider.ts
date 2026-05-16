import type {
  CurrentAndDaily,
  GeocodingResult,
  HourlyForecast,
  WeatherProviderId,
  WeatherProviderModel,
} from "@agriwatch/shared";

/**
 * Options that can be passed to a provider call. Today only `model` is
 * supported; kept as an options bag so future extensions (units, scenarios,
 * ensemble percentiles) don't require breaking the signature.
 */
export type WeatherProviderCallOptions = Readonly<{
  /**
   * Provider-specific model id (e.g. `ecmwf_ifs025`). Providers that expose a
   * `models` list use it to pick which numerical model to query upstream;
   * providers without multi-model support ignore it.
   */
  model?: string;
}>;

/**
 * Port: a weather data source. Each adapter under `infrastructure/` is
 * responsible for fetching from its upstream API and mapping the raw response
 * to the unified shared types — the use cases above (and the HTTP routes)
 * never see provider-specific shapes.
 *
 * The interface is split along the two real-world access patterns rather than
 * by data type: `getCurrentAndDaily` serves the dashboard view (one HTTP call
 * upstream, one cache entry, one frontend request), and `getHourly` serves
 * the on-demand drill-down for a specific date. This matches the UX 1:1 and
 * keeps cache snapshots internally consistent — a user never sees a `current`
 * from one upstream timestamp paired with a `daily` from another.
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
  /**
   * Numerical models the caller can pick from. Providers that don't let you
   * choose (Yr.no serves a fixed internal blend) leave this `undefined`.
   * The use cases reject `opts.model` values that aren't in this list.
   */
  readonly models?: ReadonlyArray<WeatherProviderModel>;
  isAvailable(): boolean;

  getCurrentAndDaily(
    latitude: number,
    longitude: number,
    days: number,
    opts?: WeatherProviderCallOptions,
  ): Promise<CurrentAndDaily>;
  getHourly(
    latitude: number,
    longitude: number,
    isoDate: string,
    opts?: WeatherProviderCallOptions,
  ): Promise<HourlyForecast[]>;
  getGeocoding?(query: string): Promise<GeocodingResult[]>;
}
