import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState } from "react";
import { createAppRouter } from "./router.tsx";

/**
 * App-level providers. Mounted once at the root.
 *
 * - QueryClient is created in component state so it survives Fast Refresh in
 *   dev and is not recreated on each render in prod.
 * - The router is created with the QueryClient in its context, so route
 *   `beforeLoad` guards can ensureQueryData() on the auth/me query without
 *   reaching for a singleton.
 */
export function Providers() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  const [router] = useState(() => createAppRouter(queryClient));

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
