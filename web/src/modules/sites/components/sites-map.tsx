import type { SitePublic } from "@agriwatch/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useRainViewerFrames } from "../hooks/use-rainviewer-frames.ts";
import { RadarLayer } from "./radar-layer.tsx";
import { RadarTimeline } from "./radar-timeline.tsx";

/** How long each animation frame stays on screen before advancing (ms).
 * 900 ms feels readable without being sluggish — short enough to convey
 * motion across the past 2 h + 30 min nowcast (~12 frames ≈ 11 s loop),
 * long enough that the agent can actually see each frame. */
const FRAME_INTERVAL_MS = 900;

type SitesMapProps = Readonly<{
  sites: SitePublic[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
  /** When `false`, the precipitation radar layer + timeline are hidden
   * and a short note replaces the timeline. Used to disable the radar
   * when the agent is looking at a future day in the daily forecast —
   * RainViewer only covers past 2 h + 30 min, showing today's radar
   * while reading Wednesday's forecast would be misleading. */
  radarEnabled?: boolean;
}>;

/**
 * Multi-site map using Leaflet + OpenStreetMap tiles (no API key needed).
 * Sites are rendered as colored circle markers — the selected one is bigger
 * and brand-green, others sit in the AgriWatch navy. Clicking a marker
 * selects that site, mirroring the sidebar selection on desktop and being
 * the primary way to switch on mobile.
 */
export function SitesMap({ sites, selectedSiteId, onSelect, radarEnabled = true }: SitesMapProps) {
  // Center the map on the selected site if there is one, otherwise on the
  // centroid of all sites. Both fall back to mid-Europe when the list is empty.
  const center = computeCenter(sites, selectedSiteId);

  // Animated precipitation radar (RainViewer). `frames` concatenates the
  // observed past (~2 h) with the nowcast (~30 min). `nowcastStartIndex`
  // marks where the forecast half begins so the timeline can render the
  // two halves differently. The animation autoplays once frames load.
  const framesQuery = useRainViewerFrames();
  const { frames, nowcastStartIndex } = useMemo(() => {
    const past = framesQuery.data?.radar.past ?? [];
    const nowcast = framesQuery.data?.radar.nowcast ?? [];
    return { frames: [...past, ...nowcast], nowcastStartIndex: past.length };
  }, [framesQuery.data]);

  const [activeIndex, setActiveIndex] = useState(0);
  // Start paused — the agent decides when to scrub. Auto-playing on mount
  // makes the map twitch behind whatever they're trying to read above.
  const [isPlaying, setIsPlaying] = useState(false);
  const initialisedRef = useRef(false);

  // Land on the latest observed frame the first time frames resolve, so
  // the map opens on "now" instead of two hours ago.
  useEffect(() => {
    if (initialisedRef.current || frames.length === 0) return;
    initialisedRef.current = true;
    setActiveIndex(Math.max(nowcastStartIndex - 1, 0));
  }, [frames.length, nowcastStartIndex]);

  // Drive the animation loop. Reset on play/pause toggle and on frame-count
  // changes (refetch every 5 min could grow the array).
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % frames.length);
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying, frames.length]);

  return (
    <>
      <MapContainer
        center={center}
        zoom={sites.length === 1 ? 11 : 7}
        // Cap at 18 — Esri World Imagery serves a fixed "no data" sentinel
        // tile beyond 19 in many regions (or earlier in remote areas),
        // which renders as a tiled error message over the map.
        maxZoom={18}
        scrollWheelZoom
        className="absolute inset-0"
      >
        {/* Esri World Imagery — high-res global satellite, free, no key.
            Picked over OSM standard tiles so the agent can see actual
            parcels / field boundaries, which is the whole point of
            looking at the map for an agri use case. */}
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={18}
          maxZoom={18}
        />
        {framesQuery.data && frames.length > 0 ? (
          <RadarLayer
            host={framesQuery.data.host}
            frames={frames}
            activeIndex={activeIndex}
            visible={radarEnabled}
          />
        ) : null}
        {/* Transparent labels overlay — city / region / country names plus
            boundaries. Esri "World Boundaries and Places" is the natural
            companion to World Imagery (same provider, aligned tile grid).
            Sits on top of the radar so place names stay readable when the
            overlay is dense. */}
        <TileLayer
          attribution="Labels &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={18}
          maxZoom={18}
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
      {radarEnabled ? (
        <RadarTimeline
          frames={frames}
          activeIndex={activeIndex}
          isPlaying={isPlaying}
          nowcastStartIndex={nowcastStartIndex}
          onIndexChange={(index) => {
            setIsPlaying(false);
            setActiveIndex(index);
          }}
          onTogglePlay={() => setIsPlaying((p) => !p)}
        />
      ) : (
        <div className="pointer-events-none absolute right-2 bottom-10 left-2 z-[1000] flex justify-center">
          <p className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 px-3 py-1.5 text-[var(--color-text-secondary)] text-xs shadow-md backdrop-blur-sm">
            Live radar shown for today only — pick today in the table to scrub.
          </p>
        </div>
      )}
    </>
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

const DEFAULT_CENTER: [number, number] = [47, 7.5]; // central-western Europe

function computeCenter(sites: SitePublic[], selectedSiteId: string | null): [number, number] {
  if (sites.length === 0) return DEFAULT_CENTER;
  const selected = sites.find((s) => s.id === selectedSiteId);
  if (selected) return [selected.latitude, selected.longitude];
  const avgLat = sites.reduce((acc, s) => acc + s.latitude, 0) / sites.length;
  const avgLng = sites.reduce((acc, s) => acc + s.longitude, 0) / sites.length;
  return [avgLat, avgLng];
}
