import {
  type GeocodingResult,
  geocodingResultSchema,
  geocodingSearchResponseSchema,
} from "@agriwatch/shared";
import { readApiError } from "@/shared/api/api-error.ts";

const API_BASE = "/api/geocoding";

export async function searchLocations(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<GeocodingResult[]> {
  const url = new URL(`${API_BASE}/search`, globalThis.location.origin);
  url.searchParams.set("q", query);
  if (options.limit !== undefined) url.searchParams.set("limit", String(options.limit));

  const res = await fetch(url, { credentials: "include", signal: options.signal });
  if (!res.ok) throw await readApiError(res, "Geocoding search failed.");
  return geocodingSearchResponseSchema.parse(await res.json());
}

/**
 * Reverse-geocode coordinates. Returns `null` when no location matches (404).
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  options: { signal?: AbortSignal } = {},
): Promise<GeocodingResult | null> {
  const url = new URL(`${API_BASE}/reverse`, globalThis.location.origin);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lng", String(longitude));

  const res = await fetch(url, { credentials: "include", signal: options.signal });
  if (res.status === 404) return null;
  if (!res.ok) throw await readApiError(res, "Reverse geocoding failed.");
  return geocodingResultSchema.parse(await res.json());
}
