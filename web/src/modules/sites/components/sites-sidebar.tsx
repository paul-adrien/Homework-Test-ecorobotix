import type { SitePublic } from "@agriwatch/shared";
import { AddSiteButton } from "./add-site-button.tsx";
import { SiteRow } from "./site-row.tsx";

type SitesSidebarProps = Readonly<{
  sites: SitePublic[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
}>;

/**
 * Desktop sidebar listing every site as a clickable row. The selected site is
 * highlighted with the brand green. An "+ Add site" button at the bottom
 * gives users a second entry into the create flow (the header also exposes
 * one).
 */
export function SitesSidebar({ sites, selectedSiteId, onSelect }: SitesSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-2 border-[var(--color-border-subtle)] border-r bg-[var(--color-surface)] p-4 sm:w-64 sm:shrink-0">
      <h2 className="px-2 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
        My sites ({sites.length})
      </h2>
      <ul className="flex flex-1 flex-col gap-1">
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
        <AddSiteButton variant="secondary" size="sm" />
      </div>
    </aside>
  );
}
