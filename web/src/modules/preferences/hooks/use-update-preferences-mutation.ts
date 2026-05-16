import type { UserPreferences } from "@agriwatch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePreferences } from "../api/preferences.api.ts";
import { preferencesQueryKey } from "./use-preferences.ts";

/**
 * Mutation hook for `PATCH /api/me/preferences`. Optimistically updates the
 * cached preferences blob so heart toggles feel instant, then reconciles
 * with the server response. On failure the previous snapshot is restored
 * so a network blip doesn't leave the UI in a stale state.
 *
 * The same hook serves every preference field — the partial body only
 * carries what the caller is changing, so the merge step on the cache
 * mirrors the backend's behaviour (missing fields = unchanged).
 */
export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePreferences,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: preferencesQueryKey });
      const previous = queryClient.getQueryData<UserPreferences>(preferencesQueryKey);
      if (previous) {
        const next: UserPreferences = {
          temperatureUnit: input.temperatureUnit ?? previous.temperatureUnit,
          defaultSiteId:
            input.defaultSiteId === undefined ? previous.defaultSiteId : input.defaultSiteId,
        };
        queryClient.setQueryData(preferencesQueryKey, next);
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(preferencesQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: preferencesQueryKey });
    },
  });
}
