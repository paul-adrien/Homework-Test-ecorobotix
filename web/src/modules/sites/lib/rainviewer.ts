/**
 * RainViewer (free, no API key) — global precipitation radar composite
 * exposed as tile layers. Each "frame" is a snapshot of the radar at a
 * specific UTC timestamp; the API serves the past ~2 h plus a 30-min
 * nowcast every 10 min. See https://rainviewer.com/api.html.
 */

export type RainViewerFrame = Readonly<{
  /** UNIX timestamp in seconds (UTC). */
  time: number;
  /** Path fragment to append to `host` when building the tile URL. */
  path: string;
}>;

export type RainViewerData = Readonly<{
  /** Tile cache host — currently `https://tilecache.rainviewer.com`. */
  host: string;
  radar: Readonly<{
    /** Frames already observed, in chronological order. */
    past: ReadonlyArray<RainViewerFrame>;
    /** Forecast frames (next ~30 min), in chronological order. */
    nowcast: ReadonlyArray<RainViewerFrame>;
  }>;
}>;

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";

export async function fetchRainViewerFrames(signal?: AbortSignal): Promise<RainViewerData> {
  const res = await fetch(RAINVIEWER_API, { signal });
  if (!res.ok) throw new Error(`RainViewer responded with HTTP ${res.status}.`);
  const data = (await res.json()) as RainViewerData;
  return data;
}

/**
 * Build a Leaflet tile URL template for a given frame. RainViewer's URL
 * shape: `${host}${path}/{size}/{z}/{x}/{y}/{color}/{options}.png`.
 *  - size: 256 keeps tiles small (4x faster downloads than 512)
 *  - color scheme 2: "Universal Blue" — neutral, reads well over a
 *    satellite basemap. Schemes 0/1 (NWS, BOM) lean too red/green and
 *    fight the satellite imagery.
 *  - options "1_1": smooth (gradient between cells) + show snow as blue.
 */
export function buildRainViewerTileUrl(host: string, path: string): string {
  return `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;
}

/** Format a frame's UNIX timestamp as a local-time "HH:mm" string. */
export function formatFrameTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
