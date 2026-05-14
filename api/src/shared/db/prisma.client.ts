import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma Client.
 * Reused across the app so we don't exhaust the database connection pool.
 */
export const prisma = new PrismaClient({
  log: process.env["NODE_ENV"] === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});
