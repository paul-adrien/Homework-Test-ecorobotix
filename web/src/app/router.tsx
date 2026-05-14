import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import {
  redirectIfAuthenticated,
  requireAuthenticated,
} from "@/modules/auth/guards/route-guards.ts";
import { LoginPage } from "@/modules/auth/pages/login-page.tsx";
import { SignupPage } from "@/modules/auth/pages/signup-page.tsx";
import { DashboardPage } from "./dashboard-page.tsx";

type RouterContext = {
  queryClient: QueryClient;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: ({ context }) => requireAuthenticated(context),
  component: DashboardPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: ({ context }) => redirectIfAuthenticated(context),
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  beforeLoad: ({ context }) => redirectIfAuthenticated(context),
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
