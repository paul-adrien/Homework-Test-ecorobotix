import { describe, expect, it } from "vitest";
import { buildUser } from "../../test-fakes.ts";
import { sanitizeUser } from "../user.ts";

describe("sanitizeUser", () => {
  it("returns the public projection of a user", () => {
    const user = buildUser();

    const sanitized = sanitizeUser(user);

    expect(sanitized).toEqual({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  });

  it("strips the password hash", () => {
    const user = buildUser({ passwordHash: "secret-hash" });

    const sanitized = sanitizeUser(user);

    expect(sanitized).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(sanitized)).not.toContain("secret-hash");
  });

  it("strips internal timestamps that aren't in the public projection", () => {
    const user = buildUser();

    const sanitized = sanitizeUser(user);

    expect(sanitized).not.toHaveProperty("updatedAt");
  });

  it("serializes createdAt as an ISO-8601 string", () => {
    const user = buildUser({ createdAt: new Date("2026-05-14T08:00:00.000Z") });

    const sanitized = sanitizeUser(user);

    expect(sanitized.createdAt).toBe("2026-05-14T08:00:00.000Z");
  });
});
