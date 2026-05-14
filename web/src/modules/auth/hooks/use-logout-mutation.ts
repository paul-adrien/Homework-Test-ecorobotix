import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth.api.ts";
import { currentUserQueryKey } from "./use-current-user.ts";

/**
 * Logs the user out. The server clears the session cookie; we clear the entire
 * query cache to drop any per-user data (parcels, preferences, weather, ...)
 * that might still be hanging around for the previous identity.
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(currentUserQueryKey, null);
      queryClient.clear();
    },
  });
}
