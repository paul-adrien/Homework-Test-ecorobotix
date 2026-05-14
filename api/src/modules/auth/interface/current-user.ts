import type { FastifyRequest } from "fastify";
import { Unauthorized } from "../domain/auth.errors.ts";
import { fastifySessionStore } from "../infrastructure/session-store.fastify.ts";

/**
 * Read the current user's id from the session, or throw if there isn't one.
 *
 * Routes that protect themselves with `requireAuth` (preHandler) can call this
 * inside the handler with the guarantee that it never throws — but the throw
 * is still there as a defence-in-depth check for routes that forget the
 * preHandler.
 */
export function getCurrentUserIdOrThrow(request: FastifyRequest): string {
  const userId = fastifySessionStore.getUserId(request);
  if (!userId) {
    throw new Unauthorized();
  }
  return userId;
}
