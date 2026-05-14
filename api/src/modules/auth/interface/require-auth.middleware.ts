import type { FastifyReply, FastifyRequest } from "fastify";
import { fastifySessionStore } from "../infrastructure/session-store.fastify.ts";

/**
 * Fastify preHandler that rejects unauthenticated requests with 401.
 * Attach it via `{ preHandler: requireAuth }` to any route that needs a logged-in user.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = fastifySessionStore.getUserId(request);
  if (!userId) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
