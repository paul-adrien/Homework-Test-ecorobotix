import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Augment @fastify/secure-session's SessionData interface so that
 * `request.session.get("userId")` is typed `string | undefined`.
 */
declare module "@fastify/secure-session" {
  interface SessionData {
    userId: string;
  }
}

export function getSessionUserId(request: FastifyRequest): string | undefined {
  return request.session.get("userId");
}

export function setSessionUserId(request: FastifyRequest, userId: string): void {
  request.session.set("userId", userId);
}

export function clearSession(request: FastifyRequest): void {
  request.session.delete();
}

/**
 * Fastify preHandler that rejects unauthenticated requests with 401.
 * Attach it to any route that requires a logged-in user.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = getSessionUserId(request);
  if (!userId) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
