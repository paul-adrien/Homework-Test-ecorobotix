import type { FastifyRequest } from "fastify";

/**
 * Augment @fastify/secure-session's `SessionData` so `request.session.get("userId")`
 * is typed as `string | undefined`.
 */
declare module "@fastify/secure-session" {
  interface SessionData {
    userId: string;
  }
}

/**
 * Thin wrapper around the @fastify/secure-session API.
 *
 * The HTTP interface adapter (auth routes + requireAuth preHandler) uses this
 * directly. Use cases stay session-agnostic — they receive a userId or throw
 * domain errors; the interface translates those to session writes / 401 / etc.
 */
export const fastifySessionStore = {
  getUserId(request: FastifyRequest): string | undefined {
    return request.session.get("userId");
  },
  setUserId(request: FastifyRequest, userId: string): void {
    request.session.set("userId", userId);
  },
  clear(request: FastifyRequest): void {
    request.session.delete();
  },
} as const;
