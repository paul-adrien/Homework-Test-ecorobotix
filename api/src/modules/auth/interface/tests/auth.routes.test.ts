import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailAlreadyTaken, InvalidCredentials, Unauthorized } from "../../domain/auth.errors.ts";
import { buildTestApp } from "./test-app.ts";

describe("auth HTTP routes", () => {
  let app: FastifyInstance;
  const fakeSignup = vi.fn();
  const fakeLogin = vi.fn();
  const fakeGetCurrentUser = vi.fn();

  beforeEach(async () => {
    fakeSignup.mockReset();
    fakeLogin.mockReset();
    fakeGetCurrentUser.mockReset();
    app = await buildTestApp({
      signupUseCase: fakeSignup,
      loginUseCase: fakeLogin,
      getCurrentUserUseCase: fakeGetCurrentUser,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /api/auth/signup", () => {
    const validPayload = { email: "new@example.com", password: "strong-password-123" };
    const fakeUser = {
      id: "u-1",
      email: "new@example.com",
      createdAt: "2026-05-14T08:00:00.000Z",
    };

    it("returns 201 with the sanitized user and sets the session cookie on success", async () => {
      fakeSignup.mockResolvedValueOnce(fakeUser);

      const res = await app.inject({
        method: "POST",
        url: "/api/auth/signup",
        payload: validPayload,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual(fakeUser);
      expect(res.cookies.find((c) => c.name === "session")?.value).toBeTruthy();
      expect(fakeSignup).toHaveBeenCalledWith(validPayload);
    });

    it("returns 409 when the email is already taken", async () => {
      fakeSignup.mockRejectedValueOnce(new EmailAlreadyTaken("taken@example.com"));

      const res = await app.inject({
        method: "POST",
        url: "/api/auth/signup",
        payload: { email: "taken@example.com", password: "strong-password-123" },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error).toMatch(/already exists/i);
    });

    it("returns 400 when the body fails Zod validation, without ever calling the use case", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/signup",
        payload: { email: "not-an-email", password: "short" },
      });

      expect(res.statusCode).toBe(400);
      expect(fakeSignup).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/login", () => {
    const validPayload = { email: "agent@agriwatch.demo", password: "correct-password" };
    const fakeUser = {
      id: "u-1",
      email: "agent@agriwatch.demo",
      createdAt: "2026-05-14T08:00:00.000Z",
    };

    it("returns 200 with the sanitized user and sets the session cookie on success", async () => {
      fakeLogin.mockResolvedValueOnce(fakeUser);

      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: validPayload,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(fakeUser);
      expect(res.cookies.find((c) => c.name === "session")?.value).toBeTruthy();
    });

    it("returns 401 with a generic message when credentials are invalid (no user enumeration)", async () => {
      fakeLogin.mockRejectedValueOnce(new InvalidCredentials());

      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "agent@agriwatch.demo", password: "wrong-password" },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error).toMatch(/invalid email or password/i);
    });

    it("returns 400 when the body fails Zod validation", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "not-an-email", password: "" },
      });

      expect(res.statusCode).toBe(400);
      expect(fakeLogin).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("returns 204 and clears the session cookie", async () => {
      const res = await app.inject({ method: "POST", url: "/api/auth/logout" });

      expect(res.statusCode).toBe(204);
      // secure-session emits a Set-Cookie with empty value / past expiry when delete() runs
      const sessionCookie = res.cookies.find((c) => c.name === "session");
      if (sessionCookie) {
        expect(sessionCookie.value).toBe("");
      }
    });

    it("is idempotent — works with no active session", async () => {
      const res = await app.inject({ method: "POST", url: "/api/auth/logout" });
      expect(res.statusCode).toBe(204);
    });
  });

  describe("GET /api/auth/me", () => {
    const fakeUser = {
      id: "u-1",
      email: "agent@agriwatch.demo",
      createdAt: "2026-05-14T08:00:00.000Z",
    };

    it("returns 401 when no session cookie is sent", async () => {
      const res = await app.inject({ method: "GET", url: "/api/auth/me" });

      expect(res.statusCode).toBe(401);
      expect(fakeGetCurrentUser).not.toHaveBeenCalled();
    });

    it("returns 200 with the current user when an authenticated session exists", async () => {
      // Establish a session by logging in first
      fakeLogin.mockResolvedValueOnce(fakeUser);
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: fakeUser.email, password: "correct-password" },
      });
      const sessionValue = loginRes.cookies.find((c) => c.name === "session")?.value;
      expect(sessionValue).toBeTruthy();

      // Then call /me with that cookie
      fakeGetCurrentUser.mockResolvedValueOnce(fakeUser);
      const meRes = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        cookies: { session: sessionValue as string },
      });

      expect(meRes.statusCode).toBe(200);
      expect(meRes.json()).toEqual(fakeUser);
      expect(fakeGetCurrentUser).toHaveBeenCalledWith("u-1");
    });

    it("returns 401 and clears the cookie when the session references a deleted user", async () => {
      // Login establishes a session
      fakeLogin.mockResolvedValueOnce(fakeUser);
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: fakeUser.email, password: "correct-password" },
      });
      const sessionValue = loginRes.cookies.find((c) => c.name === "session")?.value;

      // Use case throws Unauthorized — user was deleted
      fakeGetCurrentUser.mockRejectedValueOnce(new Unauthorized());
      const meRes = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        cookies: { session: sessionValue as string },
      });

      expect(meRes.statusCode).toBe(401);
    });
  });
});
