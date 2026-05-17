import { useEffect, useState } from "react";
import { usePreferences } from "@/modules/preferences/hooks/use-preferences.ts";
import { EmptyState } from "@/modules/sites/components/empty-state.tsx";
import { MobileMapDrawer } from "@/modules/sites/components/mobile-map-drawer.tsx";
import { MobileSiteSelector } from "@/modules/sites/components/mobile-site-selector.tsx";
import { SitesMap } from "@/modules/sites/components/sites-map.tsx";
import { SitesSidebar } from "@/modules/sites/components/sites-sidebar.tsx";
import { useSites } from "@/modules/sites/hooks/use-sites.ts";
import { ForecastSection } from "@/modules/weather/components/forecast-section.tsx";
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
 *    `ForecastSection` (flex-1, daily summary table) in the main column.
 *  - mobile (`< sm`): the forecast is the primary content (takes the full
 *    available height). A compact `MobileSiteSelector` and a "Map" button
 *    share the top row — tapping "Map" opens the multi-site map in a
 *    75%-modal `MobileMapDrawer` on demand.
 */
export function DashboardPage() {
  const { data: sites, isLoading } = useSites();
  const { data: preferences } = usePreferences();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  // The forecast section owns its own selectedDate, but we mirror it here
  // so the map can disable its radar overlay when the agent isn't looking
  // at today (RainViewer covers past 2 h + 30 min only).
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const radarEnabled = isToday(selectedDate);

  // First-load selection honours the user's default site (US6) when it's
  // present in the current sites list. Once the user picks something
  // explicitly (`selectedSiteId !== null`), preference changes during the
  // session no longer hijack the view — the agent stays on what they were
  // looking at. The "site was deleted" fallback to sites[0] runs unchanged.
  useEffect(() => {
    if (!sites || sites.length === 0) {
      if (selectedSiteId !== null) setSelectedSiteId(null);
      return;
    }
    if (selectedSiteId === null) {
      const defaultId = preferences?.defaultSiteId;
      if (defaultId && sites.some((s) => s.id === defaultId)) {
        setSelectedSiteId(defaultId);
        return;
      }
      setSelectedSiteId(sites[0]?.id ?? null);
      return;
    }
    const stillExists = sites.some((s) => s.id === selectedSiteId);
    if (!stillExists) setSelectedSiteId(sites[0]?.id ?? null);
  }, [sites, selectedSiteId, preferences?.defaultSiteId]);

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
                onSiteCreated={(site) => setSelectedSiteId(site.id)}
              />
            </div>
            <MobileMapDrawer
              sites={sites}
              selectedSiteId={selectedSiteId}
              onSelect={setSelectedSiteId}
              radarEnabled={radarEnabled}
            />
          </div>
          {selectedSite ? (
            <ForecastSection site={selectedSite} onSelectedDateChange={setSelectedDate} />
          ) : null}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Two columns side by side. Left column is `sticky` at viewport
          height: sidebar (top third) + map (bottom two-thirds) stay
          pinned while the right-column forecast scrolls with the page.
          `self-start` keeps the sticky column from stretching to the
          full row height (which would defeat the stickiness). The
          `top-X` value clears the header (16 px py-4 + ~28 px content)
          plus the main's `p-4 sm:p-6` padding. */}
      <div className="flex flex-1 flex-row gap-4">
        <div className="sticky top-4 flex h-[calc(100dvh-5.5rem)] w-64 shrink-0 flex-col gap-4 self-start sm:top-6 sm:h-[calc(100dvh-6.5rem)]">
          <div className="h-1/3 min-h-0">
            <SitesSidebar
              sites={sites}
              selectedSiteId={selectedSiteId}
              onSelect={setSelectedSiteId}
              onSiteCreated={(site) => setSelectedSiteId(site.id)}
            />
          </div>
          <div className="isolate relative min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
            <SitesMap
              sites={sites}
              selectedSiteId={selectedSiteId}
              onSelect={setSelectedSiteId}
              radarEnabled={radarEnabled}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {selectedSite ? (
            <ForecastSection site={selectedSite} onSelectedDateChange={setSelectedDate} />
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}

/** Returns true when the ISO date string `YYYY-MM-DD` matches today in UTC.
 * Forecast dates are always emitted in UTC by the providers so the
 * comparison stays consistent across the agent's timezone. */
function isToday(isoDate: string | null): boolean {
  if (isoDate === null) return false;
  return isoDate === new Date().toISOString().slice(0, 10);
}
