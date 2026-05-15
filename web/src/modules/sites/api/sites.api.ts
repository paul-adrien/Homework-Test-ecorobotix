import {
  type SiteCreate,
  type SitePublic,
  type SiteUpdate,
  sitePublicSchema,
  sitesListSchema,
} from "@agriwatch/shared";
import { readApiError } from "@/shared/api/api-error.ts";

const API_BASE = "/api/sites";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function listSites(options: { signal?: AbortSignal } = {}): Promise<SitePublic[]> {
  const res = await fetch(API_BASE, { credentials: "include", signal: options.signal });
  if (!res.ok) throw await readApiError(res, "Failed to load sites.");
  return sitesListSchema.parse(await res.json());
}

export async function createSite(input: SiteCreate): Promise<SitePublic> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readApiError(res, "Failed to create site.");
  return sitePublicSchema.parse(await res.json());
}

export async function updateSite(id: string, input: SiteUpdate): Promise<SitePublic> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readApiError(res, "Failed to update site.");
  return sitePublicSchema.parse(await res.json());
}

export async function deleteSite(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await readApiError(res, "Failed to delete site.");
}
