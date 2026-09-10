import { describe, expect, it } from "vitest";
import { postgresSsl } from "./pg-ssl.js";

describe("postgresSsl", () => {
  it("disables SSL on localhost and Docker service names", () => {
    expect(postgresSsl("postgres://vegas:x@localhost:5432/vegas_cbutton")).toBe(false);
    expect(postgresSsl("postgres://vegas:x@127.0.0.1:5432/vegas_cbutton")).toBe(false);
    expect(postgresSsl("postgres://vegas:x@postgres:5432/vegas_cbutton")).toBe(false);
  });

  it("honors sslmode=disable", () => {
    expect(postgresSsl("postgres://vegas:x@db.example.com:5432/app?sslmode=disable")).toBe(false);
  });

  it("uses TLS for remote hosts", () => {
    expect(postgresSsl("postgres://vegas:x@db.example.com:5432/app")).toEqual({
      rejectUnauthorized: false,
    });
  });
});
