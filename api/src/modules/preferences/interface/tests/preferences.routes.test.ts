import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSessionCookieFor } from "../../../../shared/test/test-app.ts";
import { DefaultSiteNotFound } from "../../domain/preferences.errors.ts";
import { buildTestApp } from "./test-app.ts";

describe("preferences HTTP routes", () => {
  let app: FastifyInstance;
  let sessionCookie: string;
  const fakeGet = vi.fn();
  const fakeUpdate = vi.fn();

  const defaults = {
    temperatureUnit: "celsius",
    defaultSiteId: null,
    preferredProvider: "open-meteo",
  } as const;

  beforeEach(async () => {
    fakeGet.mockReset();
    fakeUpdate.mockReset();
    app = await buildTestApp({
      getPreferencesUseCase: fakeGet,
      updatePreferencesUseCase: fakeUpdate,
    });
    sessionCookie = await makeSessionCookieFor("user-1");
  });

  afterEach(async () => {
    await app.close();
  });

  describe("authentication", () => {
    it("returns 401 on both routes when no session cookie is sent", async () => {
      const routes = [
        { method: "GET", url: "/api/me/preferences" },
        { method: "PATCH", url: "/api/me/preferences", payload: { temperatureUnit: "celsius" } },
      ] as const;

      for (const r of routes) {
        const res = await app.inject(r);
        expect(res.statusCode).toBe(401);
      }
      expect(fakeGet).not.toHaveBeenCalled();
      expect(fakeUpdate).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/me/preferences", () => {
    it("returns 200 with the preferences blob", async () => {
      fakeGet.mockResolvedValueOnce(defaults);

      const res = await app.inject({
        method: "GET",
        url: "/api/me/preferences",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(defaults);
      expect(fakeGet).toHaveBeenCalledWith("user-1");
    });
  });

  describe("PATCH /api/me/preferences", () => {
    it("forwards the partial body to the use case and returns the updated blob", async () => {
      fakeUpdate.mockResolvedValueOnce({ ...defaults, temperatureUnit: "fahrenheit" });

      const res = await app.inject({
        method: "PATCH",
        url: "/api/me/preferences",
        cookies: { session: sessionCookie },
        payload: { temperatureUnit: "fahrenheit" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ...defaults, temperatureUnit: "fahrenheit" });
      expect(fakeUpdate).toHaveBeenCalledWith("user-1", { temperatureUnit: "fahrenheit" });
    });

    it("accepts an empty body as a no-op", async () => {
      fakeUpdate.mockResolvedValueOnce(defaults);

      const res = await app.inject({
        method: "PATCH",
        url: "/api/me/preferences",
        cookies: { session: sessionCookie },
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      expect(fakeUpdate).toHaveBeenCalledWith("user-1", {});
    });

    it("accepts defaultSiteId: null to clear the default", async () => {
      fakeUpdate.mockResolvedValueOnce({ ...defaults, defaultSiteId: null });

      const res = await app.inject({
        method: "PATCH",
        url: "/api/me/preferences",
        cookies: { session: sessionCookie },
        payload: { defaultSiteId: null },
      });

      expect(res.statusCode).toBe(200);
      expect(fakeUpdate).toHaveBeenCalledWith("user-1", { defaultSiteId: null });
    });

    it("returns 400 when the default site does not belong to the user", async () => {
      fakeUpdate.mockRejectedValueOnce(new DefaultSiteNotFound("ghost"));

      const res = await app.inject({
        method: "PATCH",
        url: "/api/me/preferences",
        cookies: { session: sessionCookie },
        payload: { defaultSiteId: "ghost" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: expect.stringContaining("ghost") });
    });

    it("rejects unknown temperature units at the Zod boundary (400)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/me/preferences",
        cookies: { session: sessionCookie },
        payload: { temperatureUnit: "kelvin" },
      });

      expect(res.statusCode).toBe(400);
      expect(fakeUpdate).not.toHaveBeenCalled();
    });

    it("rejects unknown provider ids at the Zod boundary (400)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/me/preferences",
        cookies: { session: sessionCookie },
        payload: { preferredProvider: "bogus" },
      });

      expect(res.statusCode).toBe(400);
      expect(fakeUpdate).not.toHaveBeenCalled();
    });
  });
});
