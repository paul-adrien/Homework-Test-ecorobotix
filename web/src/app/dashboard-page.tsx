import { useEffect, useState } from "react";
import { EmptyState } from "@/modules/sites/components/empty-state.tsx";
import { SitesMap } from "@/modules/sites/components/sites-map.tsx";
import { SitesSidebar } from "@/modules/sites/components/sites-sidebar.tsx";
import { useSites } from "@/modules/sites/hooks/use-sites.ts";
import { ForecastPlaceholder } from "@/modules/weather/components/forecast-placeholder.tsx";
import { DashboardLayout } from "./dashboard-layout.tsx";

/**
 * Dashboard view. Wraps the body in the shared `DashboardLayout` (which owns
 * the header + identity + sign-out) and decides what content to show based on
 * the sites query: a loading placeholder, the empty state, or the full
 * sidebar + map + forecast layout. The selected site is kept in local state
 * and stays in sync with the sites query.
 */
export function DashboardPage() {
  const { data: sites, isLoading } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (!sites || sites.length === 0) {
      if (selectedSiteId !== null) setSelectedSiteId(null);
      return;
    }
    const stillExists = sites.some((s) => s.id === selectedSiteId);
    if (!stillExists) setSelectedSiteId(sites[0]?.id ?? null);
  }, [sites, selectedSiteId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-[var(--color-text-secondary)]">Loading your sites…</p>
      </DashboardLayout>
    );
  }

  if (!sites || sites.length === 0) {
    return (
      <DashboardLayout hideAddSite>
        <EmptyState />
      </DashboardLayout>
    );
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? sites[0];

  return (
    <DashboardLayout>
      <div className="flex flex-1 flex-col gap-4 sm:flex-row">
        <SitesSidebar sites={sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
        <div className="flex flex-1 flex-col gap-4">
          <div className="isolate h-64 overflow-hidden rounded-lg border border-[var(--color-border-subtle)] sm:h-80">
            <SitesMap sites={sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
          </div>
          {selectedSite ? <ForecastPlaceholder site={selectedSite} /> : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
