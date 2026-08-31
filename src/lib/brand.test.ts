import { describe, expect, it } from "vitest";
import { BRAND_NAME, BRAND_TAGLINE, PRODUCT_NAME } from "./brand";

describe("brand", () => {
  it("keeps the Vegas product names", () => {
    expect(BRAND_NAME).toBe("Vegas");
    expect(PRODUCT_NAME).toBe("Кнопка контакта");
    expect(BRAND_TAGLINE).toMatch(/Vegas/);
  });
});
