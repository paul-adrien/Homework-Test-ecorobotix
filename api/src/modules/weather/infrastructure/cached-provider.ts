import type { CurrentAndDaily, HourlyForecast } from "@agriwatch/shared";
import { LRUCache } from "lru-cache";
import type { WeatherProvider } from "../ports/weather-provider.ts";

/**
 * Cache TTLs in milliseconds, tuned per access pattern. Defaults:
 *  - `currentAndDaily` (10 min) — the bundle is gated by the freshness of
 *    its `current` half (Open-Meteo refreshes current ~hourly upstream;
 *    10 min keeps the dashboard close to real time without thrashing the
 *    upstream). The `daily` part doesn't need to refresh that often, but
 *    bundling forces the shorter TTL — the trade-off is acceptable and
 *    keeps the snapshot internally consistent.
 *  - `hourly` (15 min) — hourly forecasts shift more often as upstream
 *    models update; 15 min absorbs dashboard drill-downs without staleness.
 */
export type ProviderCacheTtls = Readonly<{
  currentAndDailyMs: number;
  hourlyMs: number;
}>;

export const DEFAULT_PROVIDER_CACHE_TTLS: ProviderCacheTtls = {
  currentAndDailyMs: 10 * 60 * 1000,
  hourlyMs: 15 * 60 * 1000,
};

const DEFAULT_MAX_ENTRIES_PER_BUCKET = 500;

/**
 * Decorates a `WeatherProvider` with per-method LRU caches. The cached
 * provider exposes the same interface, so use cases and routes never see the
 * cache. Each method has its own LRU+TTL bucket because TTLs differ and we
 * want misses on one endpoint to not evict entries from another.
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
  const currentAndDailyCache = new LRUCache<string, CurrentAndDaily>({
    max: maxEntries,
    ttl: ttls.currentAndDailyMs,
  });
  const hourlyCache = new LRUCache<string, HourlyForecast[]>({
    max: maxEntries,
    ttl: ttls.hourlyMs,
  });

  return {
    id: provider.id,
    displayName: provider.displayName,
    requiresApiKey: provider.requiresApiKey,
    models: provider.models,
    isAvailable: () => provider.isAvailable(),

    async getCurrentAndDaily(latitude, longitude, days, opts) {
      const key = `${coordKey(latitude, longitude)}|d=${days}|m=${opts?.model ?? "default"}`;
      const hit = currentAndDailyCache.get(key);
      if (hit !== undefined) return hit;
      const fresh = await provider.getCurrentAndDaily(latitude, longitude, days, opts);
      currentAndDailyCache.set(key, fresh);
      return fresh;
    },

    async getHourly(latitude, longitude, isoDate, opts) {
      const key = `${coordKey(latitude, longitude)}|date=${isoDate}|m=${opts?.model ?? "default"}`;
      const hit = hourlyCache.get(key);
      if (hit !== undefined) return hit;
      const fresh = await provider.getHourly(latitude, longitude, isoDate, opts);
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
