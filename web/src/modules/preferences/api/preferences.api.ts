import {
  type UserPreferences,
  type UserPreferencesUpdate,
  userPreferencesSchema,
} from "@agriwatch/shared";
import { readApiError } from "@/shared/api/api-error.ts";

const API_BASE = "/api/me/preferences";

export async function fetchPreferences(
  options: { signal?: AbortSignal } = {},
): Promise<UserPreferences> {
  const res = await fetch(API_BASE, { credentials: "include", signal: options.signal });
  if (!res.ok) throw await readApiError(res, "Failed to load preferences.");
  return userPreferencesSchema.parse(await res.json());
}

export async function updatePreferences(input: UserPreferencesUpdate): Promise<UserPreferences> {
  const res = await fetch(API_BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readApiError(res, "Failed to update preferences.");
  return userPreferencesSchema.parse(await res.json());
}
