import { createHash } from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifySecureSession from "@fastify/secure-session";
import fastifySwagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "./config/env.ts";
import { registerAuthModule } from "./modules/auth/auth.module.ts";
import { registerGeocodingModule } from "./modules/geocoding/geocoding.module.ts";
import { registerPreferencesModule } from "./modules/preferences/preferences.module.ts";
import { registerSitesModule } from "./modules/sites/sites.module.ts";
import { registerWeatherModule } from "./modules/weather/weather.module.ts";
import { prisma } from "./shared/db/prisma.client.ts";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyCookie);

  const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

  await app.register(fastifySecureSession, {
    // Derive a 32-byte symmetric key deterministically from SESSION_SECRET so the secret
    // can be rotated by editing a single env var. In production this should be a
    // high-entropy value (32+ chars) loaded from a secret manager.
    key: createHash("sha256").update(env.SESSION_SECRET).digest(),
    // Internal payload validity. Must match `cookie.maxAge` — otherwise the browser keeps
    // sending the cookie after the payload's own expiry, producing 401s with a still-valid
    // cookie. Default would be 24h, silently shorter than maxAge below.
    expiry: SESSION_MAX_AGE_SECONDS,
    cookie: {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "AgriWatch API",
        description: "Weather monitoring API for field agents managing multiple sites.",
        version: "0.1.0",
      },
      servers: [{ url: "/" }],
      tags: [
        { name: "auth", description: "Authentication endpoints" },
        { name: "sites", description: "Site CRUD" },
        { name: "geocoding", description: "Forward / reverse geocoding" },
        { name: "weather", description: "Weather data from configured providers" },
        { name: "preferences", description: "User preferences" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(scalarApiReference, {
    routePrefix: "/docs",
  });

  app.get("/health", () => ({ status: "ok" }));

  await registerAuthModule(app, { prisma });
  await registerSitesModule(app, { prisma });
  await registerGeocodingModule(app);
  await registerWeatherModule(app, { prisma });
  await registerPreferencesModule(app, { prisma });

  return app;
}

const app = await buildServer();
try {
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  app.log.info(`AgriWatch API listening on http://localhost:${env.API_PORT}`);
  app.log.info(`API docs available at http://localhost:${env.API_PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
