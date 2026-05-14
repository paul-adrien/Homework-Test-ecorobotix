import type { GeocodingResult } from "@agriwatch/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeocodingProvider } from "../../ports/geocoding.provider.ts";
import { buildTestApp, makeSessionCookieFor } from "./test-app.ts";

const sampleResult: GeocodingResult = {
  name: "Yverdon-les-Bains",
  displayName: "Yverdon-les-Bains, District du Jura-Nord vaudois, Vaud, Switzerland",
  latitude: 46.7785,
  longitude: 6.6411,
  countryCode: "CH",
  country: "Switzerland",
  admin1: "Vaud",
  timezone: null,
};

describe("geocoding HTTP routes", () => {
  let app: FastifyInstance;
  let sessionCookie: string;
  const fakeProvider: GeocodingProvider = {
    search: vi.fn(),
    reverse: vi.fn(),
  };

  beforeEach(async () => {
    vi.mocked(fakeProvider.search).mockReset();
    vi.mocked(fakeProvider.reverse).mockReset();
    app = await buildTestApp(fakeProvider);
    sessionCookie = await makeSessionCookieFor("user-1");
  });

  afterEach(async () => {
    await app.close();
  });

  describe("authentication", () => {
    it("returns 401 on /geocoding/search without a session", async () => {
      const res = await app.inject({ method: "GET", url: "/api/geocoding/search?q=Yverdon" });
      expect(res.statusCode).toBe(401);
      expect(fakeProvider.search).not.toHaveBeenCalled();
    });

    it("returns 401 on /geocoding/reverse without a session", async () => {
      const res = await app.inject({ method: "GET", url: "/api/geocoding/reverse?lat=46&lng=6" });
      expect(res.statusCode).toBe(401);
      expect(fakeProvider.reverse).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/geocoding/search", () => {
    it("returns 200 with the provider results", async () => {
      vi.mocked(fakeProvider.search).mockResolvedValueOnce([sampleResult]);

      const res = await app.inject({
        method: "GET",
        url: "/api/geocoding/search?q=Yverdon",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([sampleResult]);
      expect(fakeProvider.search).toHaveBeenCalledWith("Yverdon", { limit: undefined });
    });

    it("forwards the optional limit query param to the provider", async () => {
      vi.mocked(fakeProvider.search).mockResolvedValueOnce([]);

      await app.inject({
        method: "GET",
        url: "/api/geocoding/search?q=Yverdon&limit=5",
        cookies: { session: sessionCookie },
      });

      expect(fakeProvider.search).toHaveBeenCalledWith("Yverdon", { limit: 5 });
    });

    it("returns 400 when q is missing", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/geocoding/search",
        cookies: { session: sessionCookie },
      });
      expect(res.statusCode).toBe(400);
      expect(fakeProvider.search).not.toHaveBeenCalled();
    });

    it("returns 502 when the provider throws", async () => {
      vi.mocked(fakeProvider.search).mockRejectedValueOnce(new Error("Nominatim down"));

      const res = await app.inject({
        method: "GET",
        url: "/api/geocoding/search?q=Yverdon",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(502);
      expect(res.json().error).toMatch(/unavailable/i);
    });
  });

  describe("GET /api/geocoding/reverse", () => {
    it("returns 200 with the result when the provider finds one", async () => {
      vi.mocked(fakeProvider.reverse).mockResolvedValueOnce(sampleResult);

      const res = await app.inject({
        method: "GET",
        url: "/api/geocoding/reverse?lat=46.78&lng=6.64",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(sampleResult);
      expect(fakeProvider.reverse).toHaveBeenCalledWith(46.78, 6.64);
    });

    it("returns 404 when the provider returns null", async () => {
      vi.mocked(fakeProvider.reverse).mockResolvedValueOnce(null);

      const res = await app.inject({
        method: "GET",
        url: "/api/geocoding/reverse?lat=0&lng=0",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 400 when lat/lng are missing or out of range", async () => {
      const missing = await app.inject({
        method: "GET",
        url: "/api/geocoding/reverse",
        cookies: { session: sessionCookie },
      });
      expect(missing.statusCode).toBe(400);

      const outOfRange = await app.inject({
        method: "GET",
        url: "/api/geocoding/reverse?lat=99&lng=0",
        cookies: { session: sessionCookie },
      });
      expect(outOfRange.statusCode).toBe(400);
      expect(fakeProvider.reverse).not.toHaveBeenCalled();
    });

    it("returns 502 when the provider throws", async () => {
      vi.mocked(fakeProvider.reverse).mockRejectedValueOnce(new Error("Nominatim down"));

      const res = await app.inject({
        method: "GET",
        url: "/api/geocoding/reverse?lat=46&lng=6",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(502);
    });
  });
});
