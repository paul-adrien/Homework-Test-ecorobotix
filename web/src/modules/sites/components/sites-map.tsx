import type { SitePublic } from "@agriwatch/shared";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type SitesMapProps = Readonly<{
  sites: SitePublic[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
}>;

/**
 * Multi-site map using Leaflet + OpenStreetMap tiles (no API key needed).
 * Sites are rendered as colored circle markers — the selected one is bigger
 * and brand-green, others sit in the AgriWatch navy. Clicking a marker
 * selects that site, mirroring the sidebar selection on desktop and being
 * the primary way to switch on mobile.
 */
export function SitesMap({ sites, selectedSiteId, onSelect }: SitesMapProps) {
  // Center the map on the selected site if there is one, otherwise on the
  // centroid of all sites. Both fall back to mid-Europe when the list is empty.
  const center = computeCenter(sites, selectedSiteId);

  return (
    <MapContainer
      center={center}
      zoom={sites.length === 1 ? 11 : 7}
      scrollWheelZoom
      className="size-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnSelection sites={sites} selectedSiteId={selectedSiteId} />
      {sites.map((site) => {
        const isSelected = site.id === selectedSiteId;
        return (
          <CircleMarker
            key={site.id}
            center={[site.latitude, site.longitude]}
            radius={isSelected ? 11 : 7}
            pathOptions={{
              fillColor: isSelected ? "#4DC270" : "#0D2743",
              fillOpacity: 0.85,
              color: "#FFFFFF",
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelect(site.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {site.label}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

/**
 * Pan the map smoothly to the selected site whenever it changes. Lives inside
 * `<MapContainer>` so it has access to the leaflet instance via `useMap`.
 */
function RecenterOnSelection({
  sites,
  selectedSiteId,
}: Readonly<{ sites: SitePublic[]; selectedSiteId: string | null }>) {
  const map = useMap();
  const selected = sites.find((s) => s.id === selectedSiteId);

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 10), {
        duration: 0.6,
      });
    }
  }, [map, selected]);

  return null;
}

const DEFAULT_CENTER: [number, number] = [47.0, 7.5]; // central-western Europe

function computeCenter(sites: SitePublic[], selectedSiteId: string | null): [number, number] {
  if (sites.length === 0) return DEFAULT_CENTER;
  const selected = sites.find((s) => s.id === selectedSiteId);
  if (selected) return [selected.latitude, selected.longitude];
  const avgLat = sites.reduce((acc, s) => acc + s.latitude, 0) / sites.length;
  const avgLng = sites.reduce((acc, s) => acc + s.longitude, 0) / sites.length;
  return [avgLat, avgLng];
}
