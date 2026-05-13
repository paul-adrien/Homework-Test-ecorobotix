import { z } from "zod";

/**
 * Environment variables are parsed and validated at startup.
 * The server crashes fast and explicitly if any required var is missing or malformed.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Optional providers (Phase 2). Empty string treated as undefined.
  OPENWEATHERMAP_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  WEATHERAPI_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
