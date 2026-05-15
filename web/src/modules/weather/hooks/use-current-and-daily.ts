import type { SitePublic, WeatherProviderId } from "@agriwatch/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentAndDaily } from "../api/weather.api.ts";

export const weatherBundleQueryKey = (
  siteId: string,
  days: number,
  providerId?: WeatherProviderId,
  model?: string,
) => ["weather", "bundle", siteId, days, providerId ?? "default", model ?? "default"] as const;

type UseCurrentAndDailyOptions = Readonly<{
  site: SitePublic;
  days: number;
  providerId?: WeatherProviderId;
  model?: string;
}>;

/**
 * Loads the current+daily bundle for a given site. Keyed by the site id (not
 * raw coords) so switching back and forth between sites doesn't re-fetch
 * cached entries. Frontend `staleTime` mirrors the upstream cache TTL — the
 * server-side cache already absorbs the duplicate work, so a tight 5-min
 * `staleTime` here keeps the dashboard fresh without thrashing.
 */
export function useCurrentAndDaily({ site, days, providerId, model }: UseCurrentAndDailyOptions) {
  return useQuery({
    queryKey: weatherBundleQueryKey(site.id, days, providerId, model),
    queryFn: ({ signal }) =>
      fetchCurrentAndDaily({
        latitude: site.latitude,
        longitude: site.longitude,
        days,
        providerId,
        model,
        signal,
      }),
    staleTime: 5 * 60_000,
  });
}
