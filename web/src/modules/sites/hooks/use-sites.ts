import { useQuery } from "@tanstack/react-query";
import { listSites } from "../api/sites.api.ts";

export const sitesQueryKey = ["sites"] as const;

/**
 * Loads every site owned by the current user. Single source of truth for the
 * sites list across the dashboard, sidebar, map and create flow.
 */
export function useSites() {
  return useQuery({
    queryKey: sitesQueryKey,
    queryFn: ({ signal }) => listSites({ signal }),
    staleTime: 60_000,
  });
}
