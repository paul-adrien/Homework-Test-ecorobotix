import { EmptyState } from "@/modules/sites/components/empty-state.tsx";
import { SitesPreview } from "@/modules/sites/components/sites-preview.tsx";
import { useSites } from "@/modules/sites/hooks/use-sites.ts";
import { DashboardLayout } from "./dashboard-layout.tsx";

/**
 * Dashboard view. Wraps the body in the shared `DashboardLayout` (which owns
 * the header + identity + sign-out) and decides what content to show based on
 * the sites query.
 *
 * This is a temporary preview — the real sidebar + map + forecast layout
 * lands in Phase 2.C4 and replaces the body.
 */
export function DashboardPage() {
  const { data: sites, isLoading } = useSites();

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-[var(--color-text-secondary)]">Loading your sites…</p>
      </DashboardLayout>
    );
  }

  if (!sites || sites.length === 0) {
    return (
      <DashboardLayout>
        <EmptyState />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SitesPreview sites={sites} />
    </DashboardLayout>
  );
}
