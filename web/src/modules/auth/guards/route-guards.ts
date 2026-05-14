import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "../api/auth.api.ts";
import { currentUserQueryKey } from "../hooks/use-current-user.ts";

type GuardContext = { queryClient: QueryClient };

/**
 * Single source of truth for "do we have a logged-in user right now?". Uses
 * `ensureQueryData` so we hit the cache when possible and only fire one
 * `/api/auth/me` request when the cache is empty.
 */
async function resolveCurrentUser(ctx: GuardContext) {
  return ctx.queryClient.ensureQueryData({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
  });
}

/**
 * Use as a route `beforeLoad` to protect a route. Sends unauthenticated
 * visitors to `/login`.
 */
export async function requireAuthenticated(ctx: GuardContext): Promise<void> {
  const user = await resolveCurrentUser(ctx);
  if (!user) throw redirect({ to: "/login" });
}

/**
 * Use as a route `beforeLoad` on guest-only routes (login, signup). Sends
 * already-authenticated visitors back to the dashboard.
 */
export async function redirectIfAuthenticated(ctx: GuardContext, to = "/"): Promise<void> {
  const user = await resolveCurrentUser(ctx);
  if (user) throw redirect({ to });
}
