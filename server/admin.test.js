import { describe, expect, it } from "vitest";
import { toLocalDate } from "./admin.js";

describe("toLocalDate", () => {
  it("accepts a Date from Postgres, not only an ISO string", () => {
    const pressedAt = new Date("2026-09-01T08:21:00.000Z");
    expect(typeof pressedAt.slice).not.toBe("function");
    expect(toLocalDate(pressedAt)).toBe("2026-09-01");
  });

  it("accepts an ISO string the same way", () => {
    expect(toLocalDate("2026-09-01T08:21:00.000Z")).toBe("2026-09-01");
  });

  it("can collect unique seller days from Date timestamps", () => {
    const days = new Set();
    for (const pressed_at of [
      new Date("2026-09-01T08:00:00.000Z"),
      new Date("2026-09-01T18:00:00.000Z"),
      new Date("2026-09-02T07:00:00.000Z"),
    ]) {
      days.add(toLocalDate(pressed_at));
    }
    expect([...days]).toEqual(["2026-09-01", "2026-09-02"]);
  });
});
