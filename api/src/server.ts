import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "./env.ts";

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

  await app.register(fastifyCookie, {
    secret: env.SESSION_SECRET,
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "AgriWatch API",
        description: "Weather monitoring API for field agents managing multiple parcels.",
        version: "0.1.0",
      },
      servers: [{ url: "/" }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(scalarApiReference, {
    routePrefix: "/docs",
  });

  app.get("/health", () => ({ status: "ok" }));

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
    app.log.info(`AgriWatch API listening on http://localhost:${env.API_PORT}`);
    app.log.info(`API docs available at http://localhost:${env.API_PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
