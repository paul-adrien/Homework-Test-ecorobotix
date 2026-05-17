import { TileLayer } from "react-leaflet";
import { buildRainViewerTileUrl, type RainViewerFrame } from "../lib/rainviewer.ts";

type RadarLayerProps = Readonly<{
  /** Tile cache host returned by RainViewer's manifest. */
  host: string;
  /** Every frame the timeline knows about — past + nowcast, in order. */
  frames: ReadonlyArray<RainViewerFrame>;
  /** Index of the frame currently visible. Others stay mounted but
   * transparent so their tiles stay warm in Leaflet's per-layer cache. */
  activeIndex: number;
  /** When `false`, every frame stays mounted but no layer is visible —
   * the dashboard uses this to hide the radar while the agent is on a
   * non-today forecast day, without losing the cached tiles (a re-mount
   * would otherwise force every frame to refetch on return). */
  visible: boolean;
}>;

const ACTIVE_OPACITY = 0.7;

/**
 * Animated RainViewer overlay. Every frame is rendered as its own
 * `<TileLayer>`, but only the active one is visible — the others sit at
 * opacity 0. This is the standard "pre-load every frame" trick: tiles
 * for all frames start loading at mount, end up in each layer's internal
 * cache, and swapping between frames becomes a free opacity flip instead
 * of an unmount/re-fetch flash.
 *
 * Trade-off: N parallel tile bursts at mount (~9 tiles × ~13 frames over
 * a typical viewport). RainViewer's CDN handles it without throttling and
 * the browser's HTTP/2 multiplexing keeps it cheap; in exchange the
 * animation runs without blanks.
 */
export function RadarLayer({ host, frames, activeIndex, visible }: RadarLayerProps) {
  return (
    <>
      {frames.map((frame, index) => (
        <TileLayer
          key={frame.path}
          url={buildRainViewerTileUrl(host, frame.path)}
          opacity={visible && index === activeIndex ? ACTIVE_OPACITY : 0}
          // RainViewer's tile pyramid tops out at zoom 7 — beyond that
          // the CDN returns a sentinel PNG that literally reads "Zoom
          // Level Not Supported". `maxNativeZoom={7}` tells Leaflet to
          // upscale the z=7 tile for deeper zooms instead of requesting
          // a level that doesn't exist. `maxZoom={18}` matches the
          // basemap so the radar stays visible (upscaled).
          maxNativeZoom={7}
          maxZoom={18}
          // `noWrap` + explicit world bounds prevent Leaflet from asking
          // for tiles past the antimeridian (x or y ≥ 2^z). Those
          // out-of-bounds requests get the same sentinel response.
          noWrap
          bounds={[
            [-85.0511, -180],
            [85.0511, 180],
          ]}
          // Attribute once across the whole stack; duplicates would
          // clutter the Leaflet attribution control.
          attribution={
            index === 0 ? 'Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>' : ""
          }
        />
      ))}
    </>
  );
}
