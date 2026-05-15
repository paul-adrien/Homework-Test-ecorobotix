import { z } from "zod";

/**
 * Identifier of a weather data source. Stays in sync with the providers
 * actually composed into the API (see `api/src/modules/weather/weather.module.ts`).
 * Adding a new provider = add its id here AND register it in the module's
 * composition root.
 */
export const weatherProviderIdSchema = z.enum(["open-meteo", "yr-no"]);
export type WeatherProviderId = z.infer<typeof weatherProviderIdSchema>;

/**
 * Current conditions snapshot at a coordinate. Every measurement is nullable
 * because not every provider exposes every variable; the UI handles missing
 * values explicitly. Units are normalised across providers:
 *  - temperatures in °C
 *  - precipitation in mm
 *  - wind speed in km/h, direction in degrees
 *  - humidity / precipitation probability in %
 *  - UV index dimensionless
 *  - soil moisture in m³/m³ (volumetric, top 1cm layer)
 */
export const currentWeatherSchema = z.object({
  providerId: weatherProviderIdSchema,
  observedAt: z.string().datetime(),
  temperature: z.number().nullable(),
  apparentTemperature: z.number().nullable(),
  precipitationLastHour: z.number().nullable(),
  precipitationProbability: z.number().nullable(),
  windSpeed: z.number().nullable(),
  windDirection: z.number().nullable(),
  humidity: z.number().nullable(),
  uvIndex: z.number().nullable(),
  soilMoisture: z.number().nullable(),
  weatherCode: z.number().nullable(),
});
export type CurrentWeather = z.infer<typeof currentWeatherSchema>;

export const dailyForecastSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  temperatureMin: z.number().nullable(),
  temperatureMax: z.number().nullable(),
  precipitationSum: z.number().nullable(),
  precipitationProbabilityMax: z.number().nullable(),
  windSpeedMax: z.number().nullable(),
  humidityMean: z.number().nullable(),
  weatherCode: z.number().nullable(),
});
export type DailyForecast = z.infer<typeof dailyForecastSchema>;
export const dailyForecastListSchema = z.array(dailyForecastSchema);

export const hourlyForecastSchema = z.object({
  time: z.string().datetime(),
  temperature: z.number().nullable(),
  precipitation: z.number().nullable(),
  precipitationProbability: z.number().nullable(),
  windSpeed: z.number().nullable(),
  windDirection: z.number().nullable(),
  humidity: z.number().nullable(),
  weatherCode: z.number().nullable(),
});
export type HourlyForecast = z.infer<typeof hourlyForecastSchema>;
export const hourlyForecastListSchema = z.array(hourlyForecastSchema);

/**
 * Bundle returned by `GET /api/weather` — the primary endpoint consumed by
 * the dashboard view. Bundles current conditions with the multi-day daily
 * forecast in a single payload so the frontend only makes one request per
 * site (and one upstream API call per cache miss). Hourly drill-down lives
 * on a separate endpoint because it's only fetched on demand.
 */
export const currentAndDailySchema = z.object({
  current: currentWeatherSchema,
  daily: dailyForecastListSchema,
});
export type CurrentAndDaily = z.infer<typeof currentAndDailySchema>;

/**
 * A numerical-weather-model offered by a provider (e.g. Open-Meteo's
 * `ecmwf_ifs04`, `icon_seamless`, etc.). Providers that don't let callers
 * pick a model (like Yr.no, which serves a fixed internal blend) simply
 * omit the `models` field from their info.
 */
export const weatherProviderModelSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
});
export type WeatherProviderModel = z.infer<typeof weatherProviderModelSchema>;

/**
 * Public-facing description of a registered provider. Returned by the
 * `GET /api/weather/providers` endpoint so the frontend switcher can show
 * only providers that are actually available (keyed providers whose env var
 * is missing are filtered out server-side) and flatten the (provider, model)
 * pairs into the switcher's dropdown.
 */
export const weatherProviderInfoSchema = z.object({
  id: weatherProviderIdSchema,
  displayName: z.string(),
  requiresApiKey: z.boolean(),
  models: z.array(weatherProviderModelSchema).optional(),
});
export type WeatherProviderInfo = z.infer<typeof weatherProviderInfoSchema>;
export const weatherProvidersListSchema = z.array(weatherProviderInfoSchema);

const coordinatesShape = {
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  provider: weatherProviderIdSchema.optional(),
  model: z.string().min(1).optional(),
};

/**
 * Query for `GET /api/weather` — the bundled dashboard endpoint that returns
 * current conditions plus a multi-day daily forecast in one round trip.
 */
export const weatherQuerySchema = z.object({
  ...coordinatesShape,
  days: z.coerce.number().int().min(1).max(14).default(7),
});
export type WeatherQuery = z.infer<typeof weatherQuerySchema>;

/**
 * Query for `GET /api/weather/hourly` — the on-demand drill-down for the
 * hourly forecast of a specific date.
 */
export const hourlyForecastQuerySchema = z.object({
  ...coordinatesShape,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type HourlyForecastQuery = z.infer<typeof hourlyForecastQuerySchema>;
