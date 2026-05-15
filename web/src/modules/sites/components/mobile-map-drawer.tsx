import type { SitePublic } from "@agriwatch/shared";
import { Map as MapIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer.tsx";
import { SitesMap } from "./sites-map.tsx";

type MobileMapDrawerProps = Readonly<{
  sites: SitePublic[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
}>;

/**
 * Mobile entry point for the multi-site map. Renders a compact "Map" button
 * that opens a 75%-height modal drawer with the Leaflet map inside. Mobile
 * agents primarily read forecast detail on the go — the map is a context tool
 * consulted occasionally to confirm which site they are acting on, so it
 * lives behind a CTA rather than competing with the forecast for screen real
 * estate.
 */
export function MobileMapDrawer({ sites, selectedSiteId, onSelect }: MobileMapDrawerProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(siteId: string) {
    onSelect(siteId);
    setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary" size="sm" className="shrink-0">
          <MapIcon className="size-4" aria-hidden="true" />
          Map
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[75vh]">
        <DrawerHeader>
          <DrawerTitle>Sites map</DrawerTitle>
        </DrawerHeader>
        <div className="isolate relative flex-1 overflow-hidden">
          <SitesMap sites={sites} selectedSiteId={selectedSiteId} onSelect={handleSelect} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
