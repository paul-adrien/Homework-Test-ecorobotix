import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { LoginPage } from "@/modules/auth/pages/login-page.tsx";
import { SignupPage } from "@/modules/auth/pages/signup-page.tsx";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-3xl text-[var(--color-dark-navy)]">AgriWatch</h1>
      <p className="text-[var(--color-text-secondary)]">
        Dashboard placeholder — protected route guard will arrive with auth wiring.
      </p>
    </main>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});

const routeTree = rootRoute.addChildren([dashboardRoute, loginRoute, signupRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
