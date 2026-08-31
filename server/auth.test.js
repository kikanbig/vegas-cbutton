import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authMiddleware,
  allowedDomain,
  emailAllowed,
  generateOtp,
  hashCode,
  signToken,
  verifyToken,
} from "./auth.js";

describe("hashCode", () => {
  it("is deterministic and different for different codes", () => {
    expect(hashCode("12345678")).toBe(hashCode("12345678"));
    expect(hashCode("12345678")).not.toBe(hashCode("87654321"));
    expect(hashCode("12345678")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("generateOtp", () => {
  it("always returns 8 digits", () => {
    for (let i = 0; i < 40; i += 1) {
      const code = generateOtp();
      expect(code).toMatch(/^\d{8}$/);
    }
  });
});

describe("emailAllowed", () => {
  const original = process.env.ALLOWED_EMAIL_DOMAIN;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOWED_EMAIL_DOMAIN;
    else process.env.ALLOWED_EMAIL_DOMAIN = original;
  });

  it("allows any email when domain is empty", () => {
    process.env.ALLOWED_EMAIL_DOMAIN = "";
    expect(allowedDomain()).toBe("");
    expect(emailAllowed("anyone@gmail.com")).toBe(true);
  });

  it("restricts to the configured domain", () => {
    process.env.ALLOWED_EMAIL_DOMAIN = " Vegas.BY ";
    expect(allowedDomain()).toBe("vegas.by");
    expect(emailAllowed("anna@vegas.by")).toBe(true);
    expect(emailAllowed("anna@gmail.com")).toBe(false);
  });
});

describe("tokens", () => {
  it("signs and verifies a seller payload", () => {
    const token = signToken({ id: "user-1", email: "anna@vegas.by" });
    const payload = verifyToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("anna@vegas.by");
  });

  it("rejects a broken token", () => {
    expect(() => verifyToken("not-a-token")).toThrow();
  });
});

describe("authMiddleware", () => {
  it("rejects missing or invalid tokens", () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authMiddleware({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();

    authMiddleware({ headers: { authorization: "Bearer nope" } }, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the user and continues", () => {
    const token = signToken({ id: "user-2", email: "ivan@vegas.by" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    authMiddleware(req, res, next);
    expect(req.user.sub).toBe("user-2");
    expect(next).toHaveBeenCalledOnce();
  });
});
