import { describe, expect, it } from "vitest";
import { ADMIN_EMAILS, isAdminEmail } from "./admins.js";

describe("admins", () => {
  it("includes the three Vegas managers", () => {
    expect(ADMIN_EMAILS).toEqual([
      "serpokrylova@vegas.by",
      "trener@vegas.by",
      "kanyushik@vegas.by",
    ]);
  });

  it("matches emails case-insensitively", () => {
    expect(isAdminEmail("Trener@Vegas.by")).toBe(true);
    expect(isAdminEmail("seller@vegas.by")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});
