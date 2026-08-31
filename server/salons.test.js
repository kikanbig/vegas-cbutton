import { describe, expect, it } from "vitest";
import { SALONS, isValidSalon } from "./salons.js";

describe("salons", () => {
  it("has 24 unique locations in the rotation list", () => {
    expect(SALONS).toHaveLength(24);
    expect(new Set(SALONS).size).toBe(24);
    expect(SALONS[0]).toBe('ТЦ "Град" пав. 559');
    expect(SALONS).toContain('Салон "Vegas" (Уручье)');
    expect(SALONS).toContain('ТЦ "Интериум"');
  });

  it("accepts only exact list values", () => {
    expect(isValidSalon('ТЦ "Coolman"')).toBe(true);
    expect(isValidSalon("Coolman")).toBe(false);
    expect(isValidSalon("")).toBe(false);
    expect(isValidSalon(null)).toBe(false);
    expect(isValidSalon(12)).toBe(false);
  });
});
