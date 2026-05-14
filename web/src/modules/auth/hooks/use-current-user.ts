import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../api/auth.api.ts";

export const currentUserQueryKey = ["auth", "currentUser"] as const;

/**
 * Resolves the currently authenticated user, or `null` when no valid session
 * exists. Used by the route guard and by any component that needs to display
 * the user's identity.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    staleTime: 60_000,
    retry: false,
  });
}
