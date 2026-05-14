import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState } from "react";
import { router } from "./router.tsx";

/**
 * App-level providers. Mounted once at the root.
 *
 * - QueryClient is created in component state so it survives Fast Refresh in
 *   dev and is not recreated on each render in prod.
 * - The TanStack Router is plugged in via RouterProvider; route components
 *   live under `modules/<bounded-context>/pages/` and are referenced from
 *   `router.tsx`.
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

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
