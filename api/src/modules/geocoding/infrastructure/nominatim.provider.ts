import type { GeocodingResult } from "@agriwatch/shared";
import type { GeocodingProvider } from "../ports/geocoding.provider.ts";

const BASE_URL = "https://nominatim.openstreetmap.org";

// Nominatim's usage policy requires a meaningful User-Agent that identifies the
// app — they block default Node/fetch UAs. See https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = "AgriWatch/0.1.0 (https://github.com/paul-adrien/Homework-Test-ecorobotix)";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  county?: string;
  country?: string;
  country_code?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: NominatimAddress;
};

function mapResult(result: NominatimResult): GeocodingResult {
  const address = result.address ?? {};
  // Nominatim's `name` field is sometimes missing; fall back to the most
  // specific address component, then the first segment of display_name.
  const fallbackName =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    result.display_name.split(",")[0]?.trim() ||
    "Unknown location";

  return {
    name: result.name && result.name.trim().length > 0 ? result.name : fallbackName,
    displayName: result.display_name,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    countryCode: address.country_code ? address.country_code.toUpperCase() : null,
    country: address.country ?? null,
    admin1: address.state ?? null,
    // Nominatim does not return timezones — added later via a tz lookup if needed.
    timezone: null,
  };
}

const commonHeaders = {
  "User-Agent": USER_AGENT,
  "Accept-Language": "en",
};

export function createNominatimProvider(): GeocodingProvider {
  return {
    async search(query, options = {}) {
      const limit = options.limit ?? 10;
      const url = new URL(`${BASE_URL}/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("addressdetails", "1");

      const res = await fetch(url, { headers: commonHeaders });
      if (!res.ok) {
        throw new Error(`Nominatim search failed: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as NominatimResult[];
      return data.map(mapResult);
    },

    async reverse(latitude, longitude) {
      const url = new URL(`${BASE_URL}/reverse`);
      url.searchParams.set("lat", String(latitude));
      url.searchParams.set("lon", String(longitude));
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");

      const res = await fetch(url, { headers: commonHeaders });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Nominatim reverse failed: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as NominatimResult | { error: string };
      if ("error" in data) return null;
      return mapResult(data);
    },
  };
}
