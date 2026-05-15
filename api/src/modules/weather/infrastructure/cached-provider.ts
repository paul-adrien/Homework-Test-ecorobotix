import type { CurrentWeather, DailyForecast, HourlyForecast } from "@agriwatch/shared";
import { LRUCache } from "lru-cache";
import type { WeatherProvider } from "../ports/weather-provider.ts";

/**
 * Cache TTLs in milliseconds, tuned per data type. Defaults track the project
 * bible:
 *  - `current` (10 min) — observations refresh roughly hourly upstream; 10
 *    minutes is short enough that an agent never sees state more than a
 *    coffee break old, long enough to absorb dashboard refreshes.
 *  - `daily` (30 min) — daily forecasts barely move within the day; 30 min
 *    keeps API load low.
 *  - `hourly` (15 min) — hourly forecasts shift more often as upstream models
 *    update.
 */
export type ProviderCacheTtls = Readonly<{
  currentMs: number;
  dailyMs: number;
  hourlyMs: number;
}>;

export const DEFAULT_PROVIDER_CACHE_TTLS: ProviderCacheTtls = {
  currentMs: 10 * 60 * 1000,
  dailyMs: 30 * 60 * 1000,
  hourlyMs: 15 * 60 * 1000,
};

const DEFAULT_MAX_ENTRIES_PER_BUCKET = 500;

/**
 * Decorates a `WeatherProvider` with per-method LRU caches. The cached
 * provider exposes the same interface, so use cases and routes never see the
 * cache. Each method has its own LRU+TTL bucket because TTLs differ by data
 * type and we want misses on one endpoint to not evict entries from another.
 *
 * Coordinates are rounded to 4 decimals (~11m precision) before being used
 * as a key fragment so callers querying near-identical points share cache
 * entries — agricultural sites rarely need sub-decameter granularity, and
 * upstream providers downsample anyway.
 *
 * Use this for providers without a native HTTP-revalidation contract
 * (Open-Meteo, OpenWeatherMap, WeatherAPI). For providers like Yr.no, whose
 * policy *requires* `If-Modified-Since` revalidation, the adapter itself
 * implements an HTTP-aware cache and is NOT wrapped here.
 */
export function createCachedProvider(
  provider: WeatherProvider,
  ttls: ProviderCacheTtls = DEFAULT_PROVIDER_CACHE_TTLS,
  maxEntries = DEFAULT_MAX_ENTRIES_PER_BUCKET,
): WeatherProvider {
  const currentCache = new LRUCache<string, CurrentWeather>({
    max: maxEntries,
    ttl: ttls.currentMs,
  });
  const dailyCache = new LRUCache<string, DailyForecast[]>({
    max: maxEntries,
    ttl: ttls.dailyMs,
  });
  const hourlyCache = new LRUCache<string, HourlyForecast[]>({
    max: maxEntries,
    ttl: ttls.hourlyMs,
  });

  return {
    id: provider.id,
    displayName: provider.displayName,
    requiresApiKey: provider.requiresApiKey,
    isAvailable: () => provider.isAvailable(),

    async getCurrent(latitude, longitude) {
      const key = coordKey(latitude, longitude);
      const hit = currentCache.get(key);
      if (hit !== undefined) return hit;
      const fresh = await provider.getCurrent(latitude, longitude);
      currentCache.set(key, fresh);
      return fresh;
    },

    async getDailyForecast(latitude, longitude, days) {
      const key = `${coordKey(latitude, longitude)}|d=${days}`;
      const hit = dailyCache.get(key);
      if (hit !== undefined) return hit;
      const fresh = await provider.getDailyForecast(latitude, longitude, days);
      dailyCache.set(key, fresh);
      return fresh;
    },

    async getHourlyForecast(latitude, longitude, isoDate) {
      const key = `${coordKey(latitude, longitude)}|date=${isoDate}`;
      const hit = hourlyCache.get(key);
      if (hit !== undefined) return hit;
      const fresh = await provider.getHourlyForecast(latitude, longitude, isoDate);
      hourlyCache.set(key, fresh);
      return fresh;
    },

    ...wrapGeocoding(provider.getGeocoding?.bind(provider)),
  };
}

function wrapGeocoding(fn: WeatherProvider["getGeocoding"]): Pick<WeatherProvider, "getGeocoding"> {
  if (!fn) return {};
  return { getGeocoding: (query: string) => fn(query) };
}

function coordKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}
