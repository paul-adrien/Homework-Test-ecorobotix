import {
  type LoginInput,
  type SignupInput,
  type UserPublic,
  userPublicSchema,
} from "@agriwatch/shared";

const API_BASE = "/api/auth";

export class AuthApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

/**
 * Read the server's JSON error message (Fastify shape: `{ error, message, statusCode }`)
 * and surface it via AuthApiError. Falls back to a generic message if parsing fails.
 */
async function readError(res: Response, fallback: string): Promise<AuthApiError> {
  try {
    const data = (await res.json()) as { error?: unknown; message?: unknown };
    if (typeof data.error === "string") return new AuthApiError(res.status, data.error);
    if (typeof data.message === "string") return new AuthApiError(res.status, data.message);
  } catch {
    // ignore parse failure — fall through to the fallback
  }
  return new AuthApiError(res.status, fallback);
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function signup(input: SignupInput): Promise<UserPublic> {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res, "Signup failed.");
  return userPublicSchema.parse(await res.json());
}

export async function login(input: LoginInput): Promise<UserPublic> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res, "Login failed.");
  return userPublicSchema.parse(await res.json());
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw await readError(res, "Logout failed.");
}

/**
 * Returns the current user, or `null` if the session is missing/expired (401).
 * Other errors (network, 5xx) bubble up as AuthApiError.
 */
export async function getCurrentUser(): Promise<UserPublic | null> {
  const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw await readError(res, "Failed to load current user.");
  return userPublicSchema.parse(await res.json());
}
