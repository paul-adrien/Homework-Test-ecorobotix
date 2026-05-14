import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteLabelAlreadyTaken, SiteNotFound } from "../../domain/site.errors.ts";
import { buildTestApp, makeSessionCookieFor } from "./test-app.ts";

describe("sites HTTP routes", () => {
  let app: FastifyInstance;
  let sessionCookie: string;
  const fakeCreate = vi.fn();
  const fakeList = vi.fn();
  const fakeGet = vi.fn();
  const fakeUpdate = vi.fn();
  const fakeDelete = vi.fn();

  beforeEach(async () => {
    fakeCreate.mockReset();
    fakeList.mockReset();
    fakeGet.mockReset();
    fakeUpdate.mockReset();
    fakeDelete.mockReset();
    app = await buildTestApp({
      createSiteUseCase: fakeCreate,
      listSitesUseCase: fakeList,
      getSiteUseCase: fakeGet,
      updateSiteUseCase: fakeUpdate,
      deleteSiteUseCase: fakeDelete,
    });
    sessionCookie = await makeSessionCookieFor("user-1");
  });

  afterEach(async () => {
    await app.close();
  });

  const sitePublic = {
    id: "site-1",
    label: "North field",
    displayName: null,
    latitude: 46.78,
    longitude: 6.64,
    countryCode: null,
    timezone: null,
    cropType: null,
    createdAt: "2026-05-14T08:00:00.000Z",
    updatedAt: "2026-05-14T08:00:00.000Z",
  };

  const validCreateBody = {
    label: "North field",
    latitude: 46.78,
    longitude: 6.64,
  };

  describe("authentication", () => {
    it("returns 401 on every route when no session cookie is sent", async () => {
      const routes = [
        { method: "POST", url: "/api/sites", payload: validCreateBody },
        { method: "GET", url: "/api/sites" },
        { method: "GET", url: "/api/sites/site-1" },
        { method: "PATCH", url: "/api/sites/site-1", payload: { label: "x" } },
        { method: "DELETE", url: "/api/sites/site-1" },
      ] as const;

      for (const r of routes) {
        const res = await app.inject(r);
        expect(res.statusCode).toBe(401);
      }
      expect(fakeCreate).not.toHaveBeenCalled();
      expect(fakeList).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/sites", () => {
    it("returns 201 with the created site on success", async () => {
      fakeCreate.mockResolvedValueOnce(sitePublic);

      const res = await app.inject({
        method: "POST",
        url: "/api/sites",
        cookies: { session: sessionCookie },
        payload: validCreateBody,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual(sitePublic);
      expect(fakeCreate).toHaveBeenCalledWith("user-1", validCreateBody);
    });

    it("returns 409 when SiteLabelAlreadyTaken is thrown", async () => {
      fakeCreate.mockRejectedValueOnce(new SiteLabelAlreadyTaken("North field"));

      const res = await app.inject({
        method: "POST",
        url: "/api/sites",
        cookies: { session: sessionCookie },
        payload: validCreateBody,
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error).toMatch(/already have a site/i);
    });

    it("returns 400 when the body fails Zod validation, without calling the use case", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/sites",
        cookies: { session: sessionCookie },
        payload: { label: "", latitude: 999, longitude: 0 },
      });

      expect(res.statusCode).toBe(400);
      expect(fakeCreate).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/sites", () => {
    it("returns 200 with the array of sites", async () => {
      fakeList.mockResolvedValueOnce([sitePublic]);

      const res = await app.inject({
        method: "GET",
        url: "/api/sites",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([sitePublic]);
      expect(fakeList).toHaveBeenCalledWith("user-1");
    });

    it("returns 200 with an empty array when the user has no sites", async () => {
      fakeList.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: "GET",
        url: "/api/sites",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  describe("GET /api/sites/:id", () => {
    it("returns 200 with the site on success", async () => {
      fakeGet.mockResolvedValueOnce(sitePublic);

      const res = await app.inject({
        method: "GET",
        url: "/api/sites/site-1",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(sitePublic);
      expect(fakeGet).toHaveBeenCalledWith("user-1", "site-1");
    });

    it("returns 404 when SiteNotFound is thrown", async () => {
      fakeGet.mockRejectedValueOnce(new SiteNotFound("site-missing"));

      const res = await app.inject({
        method: "GET",
        url: "/api/sites/site-missing",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/sites/:id", () => {
    it("returns 200 with the updated site on success", async () => {
      const updated = { ...sitePublic, label: "Renamed" };
      fakeUpdate.mockResolvedValueOnce(updated);

      const res = await app.inject({
        method: "PATCH",
        url: "/api/sites/site-1",
        cookies: { session: sessionCookie },
        payload: { label: "Renamed" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().label).toBe("Renamed");
      expect(fakeUpdate).toHaveBeenCalledWith("user-1", "site-1", { label: "Renamed" });
    });

    it("returns 404 when SiteNotFound is thrown", async () => {
      fakeUpdate.mockRejectedValueOnce(new SiteNotFound("missing"));

      const res = await app.inject({
        method: "PATCH",
        url: "/api/sites/missing",
        cookies: { session: sessionCookie },
        payload: { label: "X" },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 409 when SiteLabelAlreadyTaken is thrown", async () => {
      fakeUpdate.mockRejectedValueOnce(new SiteLabelAlreadyTaken("X"));

      const res = await app.inject({
        method: "PATCH",
        url: "/api/sites/site-1",
        cookies: { session: sessionCookie },
        payload: { label: "X" },
      });

      expect(res.statusCode).toBe(409);
    });
  });

  describe("DELETE /api/sites/:id", () => {
    it("returns 204 with no body on success", async () => {
      fakeDelete.mockResolvedValueOnce(undefined);

      const res = await app.inject({
        method: "DELETE",
        url: "/api/sites/site-1",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(204);
      expect(fakeDelete).toHaveBeenCalledWith("user-1", "site-1");
    });

    it("returns 404 when SiteNotFound is thrown", async () => {
      fakeDelete.mockRejectedValueOnce(new SiteNotFound("missing"));

      const res = await app.inject({
        method: "DELETE",
        url: "/api/sites/missing",
        cookies: { session: sessionCookie },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
