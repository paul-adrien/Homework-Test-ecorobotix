import { z } from "zod";

const labelSchema = z.string().trim().min(1, "Label is required").max(80, "Label is too long");

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

/**
 * Body for `POST /api/sites`. `userId` is intentionally NOT part of the schema —
 * the API derives it from the session to prevent privilege escalation.
 */
export const siteCreateSchema = z.object({
  label: labelSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  displayName: z.string().trim().max(200).optional(),
  countryCode: z.string().trim().length(2, "Country code must be a 2-letter ISO code").optional(),
  timezone: z.string().trim().max(60).optional(),
  cropType: z.string().trim().max(60).optional(),
});

/**
 * Body for `PATCH /api/sites/:id`. Every field is optional — clients send only
 * what they want to change.
 */
export const siteUpdateSchema = siteCreateSchema.partial();

/**
 * Shape of a Site returned by the API. Nullable fields stay nullable; timestamps
 * are serialised as ISO-8601 strings.
 */
export const sitePublicSchema = z.object({
  id: z.string(),
  label: z.string(),
  displayName: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  countryCode: z.string().nullable(),
  timezone: z.string().nullable(),
  cropType: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const sitesListSchema = z.array(sitePublicSchema);

export type SiteCreate = z.infer<typeof siteCreateSchema>;
export type SiteUpdate = z.infer<typeof siteUpdateSchema>;
export type SitePublic = z.infer<typeof sitePublicSchema>;
