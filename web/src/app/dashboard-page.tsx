import { useEffect, useState } from "react";
import { EmptyState } from "@/modules/sites/components/empty-state.tsx";
import { MobileMapDrawer } from "@/modules/sites/components/mobile-map-drawer.tsx";
import { MobileSiteSelector } from "@/modules/sites/components/mobile-site-selector.tsx";
import { SitesMap } from "@/modules/sites/components/sites-map.tsx";
import { SitesSidebar } from "@/modules/sites/components/sites-sidebar.tsx";
import { useSites } from "@/modules/sites/hooks/use-sites.ts";
import { ForecastPlaceholder } from "@/modules/weather/components/forecast-placeholder.tsx";
import { useIsMobile } from "@/shared/lib/use-is-mobile.ts";
import { DashboardLayout } from "./dashboard-layout.tsx";

/**
 * Dashboard view. Wraps the body in the shared `DashboardLayout` and decides
 * what content to show based on the sites query: loading, the empty state, or
 * the site selector + map + forecast layout. The selected site is kept in
 * local state and stays in sync with the sites query.
 *
 * Layouts (chosen at runtime via `useIsMobile`, not just CSS, so the map is
 * only instantiated in the branch that is actually visible — otherwise
 * Leaflet would mount in a `display:none` subtree and render blank):
 *  - desktop (`sm:` and up): `SitesSidebar` left, map (h-80) above the
 *    `ForecastPlaceholder` (flex-1) in the main column.
 *  - mobile (`< sm`): the forecast is the primary content (takes the full
 *    available height). A compact `MobileSiteSelector` and a "Map" button
 *    share the top row — tapping "Map" opens the multi-site map in a
 *    75%-modal `MobileMapDrawer` on demand.
 */
export function DashboardPage() {
  const { data: sites, isLoading } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <MobileSiteSelector
                sites={sites}
                selectedSiteId={selectedSiteId}
                onSelect={setSelectedSiteId}
              />
            </div>
            <MobileMapDrawer
              sites={sites}
              selectedSiteId={selectedSiteId}
              onSelect={setSelectedSiteId}
            />
          </div>
          {selectedSite ? <ForecastPlaceholder site={selectedSite} /> : null}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-1 flex-row gap-4">
        <SitesSidebar sites={sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
        <div className="flex flex-1 flex-col gap-4">
          <div className="isolate relative h-80 overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
            <SitesMap sites={sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
          </div>
          {selectedSite ? <ForecastPlaceholder site={selectedSite} /> : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
