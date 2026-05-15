import { useQuery } from "@tanstack/react-query";
import { fetchProviders } from "../api/weather.api.ts";

export const weatherProvidersQueryKey = ["weather", "providers"] as const;

/**
 * Loads the list of providers (and their models) the server currently
 * exposes. Used by the switcher to build its dropdown without hardcoding the
 * options on the frontend. The list is essentially static at runtime —
 * `staleTime` is set to one hour, so the request runs once per session
 * unless invalidated.
 */
export function useProviders() {
  return useQuery({
    queryKey: weatherProvidersQueryKey,
    queryFn: ({ signal }) => fetchProviders({ signal }),
    staleTime: 60 * 60_000,
  });
}
