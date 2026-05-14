import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/auth.api.ts";
import { currentUserQueryKey } from "./use-current-user.ts";

/**
 * Authenticates against the API; on success, primes the current-user query so
 * the rest of the app sees the new identity without a refetch round-trip.
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
    },
  });
}
