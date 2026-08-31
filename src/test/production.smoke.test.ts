const BASE = "https://vegas-cbutton-production.up.railway.app";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

describe("production smoke", () => {
  it("health is up", async () => {
    const { res, data } = await call("/api/health");
    expect(res.ok).toBe(true);
    expect(data.ok).toBe(true);
  });

  it("reports that email is configured", async () => {
    const { res, data } = await call("/api/config");
    expect(res.ok).toBe(true);
    expect(data.emailConfigured).toBe(true);
  });

  it("rejects a broken email and an unknown login", async () => {
    const bad = await call("/api/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", mode: "login" }),
    });
    expect(bad.res.status).toBe(400);

    const missing = await call("/api/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email: "nobody-not-registered@vegas.by", mode: "login" }),
    });
    expect(missing.res.status).toBe(400);
    expect(missing.data.error).toMatch(/аккаунт/i);
  });

  it("rejects a wrong OTP without leaking a session", async () => {
    const { res, data } = await call("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email: "nobody-not-registered@vegas.by", code: "00000000" }),
    });
    expect(res.ok).toBe(false);
    expect(data.token).toBeUndefined();
  });

  it("protects seller and admin routes", async () => {
    const me = await call("/api/me");
    const shift = await call("/api/shift");
    const admin = await call("/api/admin/stats");
    expect(me.res.status).toBe(401);
    expect(shift.res.status).toBe(401);
    expect(admin.res.status).toBe(401);
  });
});
