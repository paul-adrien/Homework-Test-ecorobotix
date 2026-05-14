/**
 * Cross-cutting API error handling — consumed by every feature module's
 * api/ wrapper.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Read the Fastify error body shape (`{ error, message, statusCode }`) from a
 * non-OK response and surface it as an ApiError. Falls back to the given
 * default message if the body can't be parsed.
 */
export async function readApiError(res: Response, fallback: string): Promise<ApiError> {
  try {
    const data = (await res.json()) as { error?: unknown; message?: unknown };
    if (typeof data.error === "string") return new ApiError(res.status, data.error);
    if (typeof data.message === "string") return new ApiError(res.status, data.message);
  } catch {
    // ignore parse failure — fall through to the fallback
  }
  return new ApiError(res.status, fallback);
}

/**
 * Map an arbitrary caught error (from a TanStack Query mutation/query result)
 * into a user-facing message, or undefined when there's nothing to show.
 * Used by forms and other surfaces that display a single inline server error.
 */
export function toServerErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return error.message;
  return "Unexpected error. Please try again.";
}
