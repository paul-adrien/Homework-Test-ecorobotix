import {
  type LoginInput,
  type SignupInput,
  type UserPublic,
  userPublicSchema,
} from "@agriwatch/shared";
import { readApiError } from "@/shared/api/api-error.ts";

const API_BASE = "/api/auth";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function signup(input: SignupInput): Promise<UserPublic> {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readApiError(res, "Signup failed.");
  return userPublicSchema.parse(await res.json());
}

export async function login(input: LoginInput): Promise<UserPublic> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readApiError(res, "Login failed.");
  return userPublicSchema.parse(await res.json());
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw await readApiError(res, "Logout failed.");
}

/**
 * Returns the current user, or `null` if the session is missing/expired (401).
 * Other errors (network, 5xx) bubble up as ApiError.
 */
export async function getCurrentUser(): Promise<UserPublic | null> {
  const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw await readApiError(res, "Failed to load current user.");
  return userPublicSchema.parse(await res.json());
}
