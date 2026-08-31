import { beforeEach, describe, expect, it } from "vitest";
import { LAST_SALON_KEY, SALONS, getSavedSalon, saveSalonLocal } from "./salons";
import { SALONS as SERVER_SALONS } from "../../server/salons.js";

describe("salons", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("matches the server rotation list", () => {
    expect([...SALONS]).toEqual(SERVER_SALONS);
    expect(SALONS).toHaveLength(24);
  });

  it("remembers the last chosen salon", () => {
    expect(getSavedSalon()).toBe("");
    saveSalonLocal('ТЦ "ТРЮМ"');
    expect(localStorage.getItem(LAST_SALON_KEY)).toBe('ТЦ "ТРЮМ"');
    expect(getSavedSalon()).toBe('ТЦ "ТРЮМ"');
  });
});
