import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql"),
  "utf8"
);

describe("schema.sql", () => {
  it("stores sale instead of project/meeting", () => {
    expect(sql).toContain("'proposal_sent', 'sale', 'refused'");
    expect(sql).not.toContain("project_offered");
  });

  it("keeps salon rotation fields", () => {
    expect(sql).toMatch(/last_salon TEXT/);
    expect(sql).toMatch(/seller_shifts[\s\S]*salon TEXT/);
  });

  it("stores a password hash and email confirmation flag", () => {
    expect(sql).toMatch(/password_hash TEXT/);
    expect(sql).toMatch(/email_verified BOOLEAN NOT NULL DEFAULT false/);
  });
});
