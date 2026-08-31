import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, getToken, setToken } from "./api";

describe("api", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("stores and clears the session token", () => {
    expect(getToken()).toBeNull();
    setToken("abc");
    expect(getToken()).toBe("abc");
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it("sends JSON and the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    setToken("tok-1");
    await api("/shift", { method: "POST", body: JSON.stringify({ salon: "x" }) });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/shift",
      expect.objectContaining({ method: "POST" })
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws the server error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Выберите салон, где вы сегодня работаете" }),
      })
    );
    await expect(api("/shift/toggle", { method: "POST" })).rejects.toThrow(
      "Выберите салон, где вы сегодня работаете"
    );
  });
});
