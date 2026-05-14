import { z } from "zod";

/**
 * One geocoding hit — used for both forward (search by name) and reverse
 * (search by lat/lng) responses. Nullable rather than optional because every
 * field is always present on the wire (the provider fills missing data with
 * null), which keeps the consumer code simpler.
 */
export const geocodingResultSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  countryCode: z.string().length(2).nullable(),
  country: z.string().nullable(),
  admin1: z.string().nullable(),
  timezone: z.string().nullable(),
});

export const geocodingSearchResponseSchema = z.array(geocodingResultSchema);

export type GeocodingResult = z.infer<typeof geocodingResultSchema>;
