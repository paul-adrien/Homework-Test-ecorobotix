import type { SitePublic } from "@agriwatch/shared";
import { ChevronsUpDown, MapPin } from "lucide-react";
import { useState } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer.tsx";
import { AddSiteButton } from "./add-site-button.tsx";
import { SiteRow } from "./site-row.tsx";

type MobileSiteSelectorProps = Readonly<{
  sites: SitePublic[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
}>;

/**
 * Compact site picker shown on mobile in place of the desktop sidebar. Renders
 * a full-width chip with the current site's label; tapping it opens a
 * bottom-sheet listing every site so the agent can switch without losing the
 * map underneath.
 */
export function MobileSiteSelector({ sites, selectedSiteId, onSelect }: MobileSiteSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? sites[0];

  function handleSelect(siteId: string) {
    onSelect(siteId);
    setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2.5 text-left"
        >
          <MapPin className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-[var(--color-text-primary)] text-sm">
              {selectedSite?.label ?? "Pick a site"}
            </span>
            {selectedSite?.displayName ? (
              <span className="truncate text-[var(--color-text-muted)] text-xs">
                {selectedSite.displayName}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown
            className="size-4 shrink-0 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between">
          <DrawerTitle>My sites ({sites.length})</DrawerTitle>
          <AddSiteButton variant="secondary" size="sm" />
        </DrawerHeader>
        <DrawerBody>
          <ul className="flex flex-col gap-1">
            {sites.map((site) => (
              <SiteRow
                key={site.id}
                site={site}
                isSelected={site.id === selectedSiteId}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
