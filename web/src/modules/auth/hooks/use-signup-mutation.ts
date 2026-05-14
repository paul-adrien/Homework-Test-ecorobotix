import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signup } from "../api/auth.api.ts";
import { currentUserQueryKey } from "./use-current-user.ts";

/**
 * Creates a new account; on success, primes the current-user query (the API
 * also sets the session cookie in the same response).
 */
export function useSignupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signup,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
    },
  });
}
