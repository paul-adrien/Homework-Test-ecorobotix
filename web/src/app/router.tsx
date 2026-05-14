import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { getCurrentUser } from "@/modules/auth/api/auth.api.ts";
import { currentUserQueryKey } from "@/modules/auth/hooks/use-current-user.ts";
import { LoginPage } from "@/modules/auth/pages/login-page.tsx";
import { SignupPage } from "@/modules/auth/pages/signup-page.tsx";
import { DashboardPage } from "./dashboard-page.tsx";

type RouterContext = {
  queryClient: QueryClient;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

/**
 * `beforeLoad` uses `ensureQueryData` so the user lookup hits the cache when
 * possible and only fires a request when the cache is empty/stale. The query
 * function returns `null` on 401, so we don't even throw on unauthenticated.
 */
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: currentUserQueryKey,
      queryFn: getCurrentUser,
    });
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: currentUserQueryKey,
      queryFn: getCurrentUser,
    });
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: currentUserQueryKey,
      queryFn: getCurrentUser,
    });
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: SignupPage,
});

const routeTree = rootRoute.addChildren([dashboardRoute, loginRoute, signupRoute]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
