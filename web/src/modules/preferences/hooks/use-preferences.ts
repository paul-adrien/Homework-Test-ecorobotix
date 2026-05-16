import { useQuery } from "@tanstack/react-query";
import { fetchPreferences } from "../api/preferences.api.ts";

export const preferencesQueryKey = ["preferences"] as const;

/**
 * Loads the authenticated user's preferences (temp unit, default site,
 * preferred provider). The backend auto-creates a defaults row on first
 * call, so the returned blob is always complete — components can rely on
 * the fields being present once `data` resolves.
 *
 * `staleTime` is generous (10 min) because preferences are user-driven and
 * rarely change between active sessions. Mutations invalidate this key.
 */
export function usePreferences() {
  return useQuery({
    queryKey: preferencesQueryKey,
    queryFn: ({ signal }) => fetchPreferences({ signal }),
    staleTime: 10 * 60_000,
  });
}
