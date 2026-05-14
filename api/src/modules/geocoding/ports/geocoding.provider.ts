import type { GeocodingResult } from "@agriwatch/shared";

/**
 * Port: forward & reverse geocoding the rest of the app needs. Implemented by
 * a concrete provider (Nominatim today; BAN, Open-Meteo or a fallback chain
 * could be plugged in later by swapping the implementation in the module's
 * composition root).
 */
export type GeocodingProvider = {
  /**
   * Forward geocoding: turns a free-text query (e.g. "Yverdon") into a list
   * of candidate locations with coordinates.
   */
  search(query: string, options?: { limit?: number }): Promise<GeocodingResult[]>;

  /**
   * Reverse geocoding: turns a (latitude, longitude) pair into a single
   * named location, or `null` if no place matches (e.g. middle of the ocean).
   */
  reverse(latitude: number, longitude: number): Promise<GeocodingResult | null>;
};
