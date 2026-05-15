import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/modules/auth/hooks/use-current-user.ts";
import { useLogoutMutation } from "@/modules/auth/hooks/use-logout-mutation.ts";
import { EmptyState } from "@/modules/sites/components/empty-state.tsx";
import { SitesPreview } from "@/modules/sites/components/sites-preview.tsx";
import { useSites } from "@/modules/sites/hooks/use-sites.ts";
import { Button } from "@/shared/ui/button.tsx";

/**
 * Dashboard shell. The real multi-site layout (sidebar + map + forecast)
 * lands in Phase 2.C4 — for now this confirms the auth + sites + geocoding
 * flow works end-to-end: an empty user lands on the empty state, can create a
 * site, and the list re-fetches automatically.
 */
export function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: sites, isLoading } = useSites();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-surface-alt)]">
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

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        {renderBody({ isLoading, sites })}
      </main>
    </div>
  );
}

function renderBody({
  isLoading,
  sites,
}: {
  isLoading: boolean;
  sites: ReturnType<typeof useSites>["data"];
}) {
  if (isLoading) {
    return <p className="text-[var(--color-text-secondary)]">Loading your sites…</p>;
  }
  if (!sites || sites.length === 0) {
    return <EmptyState />;
  }
  return <SitesPreview sites={sites} />;
}
