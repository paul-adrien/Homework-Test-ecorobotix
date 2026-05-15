import type { SitePublic, WeatherProviderId } from "@agriwatch/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchHourly } from "../api/weather.api.ts";

export const weatherHourlyQueryKey = (
  siteId: string,
  date: string,
  providerId?: WeatherProviderId,
  model?: string,
) => ["weather", "hourly", siteId, date, providerId ?? "default", model ?? "default"] as const;

type UseHourlyOptions = Readonly<{
  site: SitePublic;
  /** ISO `YYYY-MM-DD`. The query is disabled until a date is selected. */
  date: string | null;
  providerId?: WeatherProviderId;
  model?: string;
}>;

/**
 * Loads the hourly forecast for a given site on a specific date. The query
 * is **disabled** until the caller passes a non-null `date` — this matches
 * the dashboard flow where the hourly table only appears after the user has
 * picked a day from the daily summary.
 */
export function useHourly({ site, date, providerId, model }: UseHourlyOptions) {
  return useQuery({
    queryKey: weatherHourlyQueryKey(site.id, date ?? "none", providerId, model),
    queryFn: ({ signal }) =>
      fetchHourly({
        latitude: site.latitude,
        longitude: site.longitude,
        // Safe — the `enabled` flag below gates this branch on `date != null`.
        date: date as string,
        providerId,
        model,
        signal,
      }),
    enabled: date !== null,
    staleTime: 5 * 60_000,
  });
}
