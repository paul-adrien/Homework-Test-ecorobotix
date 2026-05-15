import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value.ts";
import { searchLocations } from "../api/geocoding.api.ts";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

/**
 * Debounced forward-geocoding query. Re-fires only after the user has stopped
 * typing for 300ms and the query has at least 2 chars — keeps Nominatim's
 * 1 req/s soft limit and our own network chatter low.
 */
export function useGeocodingSearch(query: string, options: { limit?: number } = {}) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  return useQuery({
    queryKey: ["geocoding", "search", debouncedQuery, options.limit ?? 10],
    queryFn: ({ signal }) => searchLocations(debouncedQuery, { limit: options.limit, signal }),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
