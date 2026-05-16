import { z } from "zod";
import { weatherProviderIdSchema } from "./weather.types.ts";

/** UI-level temperature unit. Drives all temperature displays (current,
 * daily, hourly) across the app via the active user's preference. */
export const temperatureUnitSchema = z.enum(["celsius", "fahrenheit"]);
export type TemperatureUnit = z.infer<typeof temperatureUnitSchema>;

/**
 * Shape of `GET /api/me/preferences` and the success response of
 * `PATCH /api/me/preferences`. All three fields are required because the
 * backend auto-creates a default row on first read — the API never returns
 * a partial preferences blob.
 *
 * `defaultSiteId` is nullable: the user may have no default site set, or
 * the referenced site may have been deleted (Prisma's FK is `ON DELETE
 * SET NULL`, so the column self-clears without orphaning the row).
 */
export const userPreferencesSchema = z.object({
  temperatureUnit: temperatureUnitSchema,
  defaultSiteId: z.string().nullable(),
  preferredProvider: weatherProviderIdSchema,
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

/**
 * Body of `PATCH /api/me/preferences`. All fields are optional so callers
 * can update one setting at a time (e.g. just toggle the default site
 * without re-sending the temperature unit). An empty body is allowed and
 * is a no-op — keeps the route forgiving when the UI sends a stale form.
 */
export const userPreferencesUpdateSchema = z.object({
  temperatureUnit: temperatureUnitSchema.optional(),
  defaultSiteId: z.string().nullable().optional(),
  preferredProvider: weatherProviderIdSchema.optional(),
});
export type UserPreferencesUpdate = z.infer<typeof userPreferencesUpdateSchema>;
