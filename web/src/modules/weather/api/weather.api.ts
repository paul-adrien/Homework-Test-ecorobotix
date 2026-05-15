import {
  type CurrentAndDaily,
  currentAndDailySchema,
  type HourlyForecast,
  hourlyForecastListSchema,
  type WeatherProviderId,
  type WeatherProviderInfo,
  weatherProvidersListSchema,
} from "@agriwatch/shared";
import { readApiError } from "@/shared/api/api-error.ts";

const BASE = "/api/weather";

type CoordParams = Readonly<{
  latitude: number;
  longitude: number;
  providerId?: WeatherProviderId;
  model?: string;
  signal?: AbortSignal;
}>;

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search.toString();
}

export async function fetchCurrentAndDaily(
  params: CoordParams & { days: number },
): Promise<CurrentAndDaily> {
  const qs = buildQueryString({
    lat: params.latitude,
    lng: params.longitude,
    days: params.days,
    provider: params.providerId,
    model: params.model,
  });
  const res = await fetch(`${BASE}?${qs}`, { credentials: "include", signal: params.signal });
  if (!res.ok) throw await readApiError(res, "Failed to load weather.");
  return currentAndDailySchema.parse(await res.json());
}

export async function fetchHourly(
  params: CoordParams & { date: string },
): Promise<HourlyForecast[]> {
  const qs = buildQueryString({
    lat: params.latitude,
    lng: params.longitude,
    date: params.date,
    provider: params.providerId,
    model: params.model,
  });
  const res = await fetch(`${BASE}/hourly?${qs}`, {
    credentials: "include",
    signal: params.signal,
  });
  if (!res.ok) throw await readApiError(res, "Failed to load hourly forecast.");
  return hourlyForecastListSchema.parse(await res.json());
}

export async function fetchProviders(
  options: { signal?: AbortSignal } = {},
): Promise<WeatherProviderInfo[]> {
  const res = await fetch(`${BASE}/providers`, {
    credentials: "include",
    signal: options.signal,
  });
  if (!res.ok) throw await readApiError(res, "Failed to load weather providers.");
  return weatherProvidersListSchema.parse(await res.json());
}
