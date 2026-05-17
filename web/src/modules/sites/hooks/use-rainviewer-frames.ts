import { useQuery } from "@tanstack/react-query";
import { fetchRainViewerFrames, type RainViewerData } from "../lib/rainviewer.ts";

export const rainviewerQueryKey = ["rainviewer", "frames"] as const;

const STORAGE_KEY = "agriwatch.rainviewer.manifest";
/** Beyond this age the cached manifest is considered stale and is dropped
 * — RainViewer publishes new frames every ~10 min, a cached entry older
 * than 15 min would already show stale rain. */
const STORAGE_MAX_AGE_MS = 15 * 60_000;

type StoredManifest = Readonly<{
  data: RainViewerData;
  storedAt: number;
}>;

/** Read the previously-persisted manifest from `localStorage`, or `null`
 * when nothing is cached / the cache is older than 15 min / parsing fails. */
function readStoredManifest(): StoredManifest | null {
  if (globalThis.localStorage === undefined) return null;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredManifest;
    if (Date.now() - parsed.storedAt > STORAGE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredManifest(data: RainViewerData): void {
  if (globalThis.localStorage === undefined) return;
  try {
    const payload: StoredManifest = { data, storedAt: Date.now() };
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or storage disabled — silently skip; the network
    // path still works, we just don't avoid the next refresh's fetch.
  }
}

/**
 * Polls the RainViewer manifest every 5 min — they publish a new nowcast
 * roughly every 10 min, so a 5-min interval guarantees we never sit on
 * an outdated tail without thrashing their CDN.
 *
 * Cross-refresh persistence via `localStorage`: the last successful
 * manifest is stored under `agriwatch.rainviewer.manifest`. On mount the
 * hook reads it back via `initialData` so the map shows the cached frames
 * instantly — the background refetch then replaces them if the manifest
 * has rolled over. Skipping the initial network round-trip means the
 * radar appears with the rest of the page on reload.
 */
export function useRainViewerFrames() {
  return useQuery({
    queryKey: rainviewerQueryKey,
    queryFn: async ({ signal }) => {
      const data = await fetchRainViewerFrames(signal);
      writeStoredManifest(data);
      return data;
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    initialData: () => readStoredManifest()?.data,
    initialDataUpdatedAt: () => readStoredManifest()?.storedAt,
  });
}
