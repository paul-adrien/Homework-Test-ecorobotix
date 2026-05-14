import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/modules/auth/hooks/use-current-user.ts";
import { useLogoutMutation } from "@/modules/auth/hooks/use-logout-mutation.ts";
import { Button } from "@/shared/ui/button.tsx";

/**
 * Placeholder dashboard. Will be replaced in Phase 2 with the real
 * multi-parcel overview. For now it just confirms auth works end-to-end:
 * shows the logged-in email and lets the agent log out.
 */
export function DashboardPage() {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="border-[var(--color-border-subtle)] border-b bg-[var(--color-dark-navy)] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="font-semibold text-xl tracking-tight">AgriWatch</h1>
          <div className="flex items-center gap-4 text-sm">
            {user ? <span className="text-white/80">{user.email}</span> : null}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              disabled={logoutMutation.isPending}
              onClick={() =>
                logoutMutation.mutate(undefined, {
                  onSuccess: () => navigate({ to: "/login" }),
                })
              }
            >
              {logoutMutation.isPending ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="font-semibold text-2xl text-[var(--color-dark-navy)]">
          Dashboard coming next
        </h2>
        <p className="max-w-md text-[var(--color-text-secondary)]">
          Parcels and weather forecasts will live here. For now, this page just confirms that
          authentication is wired up end-to-end.
        </p>
      </section>
    </main>
  );
}
