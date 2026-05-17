import type { SitePublic } from "@agriwatch/shared";
import { useEffect, useRef } from "react";
import { AddSiteButton } from "./add-site-button.tsx";
import { SiteRow } from "./site-row.tsx";

type SitesSidebarProps = Readonly<{
  sites: SitePublic[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
  /** Notified when the agent finishes the create flow — the dashboard
   * uses it to immediately switch the forecast over to the new site. */
  onSiteCreated?: (site: SitePublic) => void;
}>;

/**
 * Desktop sidebar listing every site as a clickable row. The selected site is
 * highlighted with the brand green. An "+ Add site" button at the bottom
 * gives users a second entry into the create flow (the header also exposes
 * one).
 */
export function SitesSidebar({
  sites,
  selectedSiteId,
  onSelect,
  onSiteCreated,
}: SitesSidebarProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (selectedSiteId === null || listRef.current === null) return;
    const target = listRef.current.querySelector<HTMLElement>(`[data-site-id="${selectedSiteId}"]`);
    target?.scrollIntoView({ block: "nearest" });
  }, [selectedSiteId]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
      <h2 className="px-2 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
        My sites ({sites.length})
      </h2>
      <ul ref={listRef} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {sites.map((site) => (
          <SiteRow
            key={site.id}
            site={site}
            isSelected={site.id === selectedSiteId}
            onSelect={onSelect}
          />
        ))}
      </ul>
      <div className="mt-2 border-[var(--color-border-subtle)] border-t pt-3">
        <AddSiteButton variant="secondary" size="sm" onCreated={onSiteCreated} />
      </div>
    </aside>
  );
}
