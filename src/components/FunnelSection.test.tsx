import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const funnel = readFileSync(path.join(process.cwd(), "src/components/FunnelSection.tsx"), "utf8");
const dialog = readFileSync(path.join(process.cwd(), "src/components/ConsultationDialog.tsx"), "utf8");
const admin = readFileSync(path.join(process.cwd(), "server/admin.js"), "utf8");

describe("sale wording", () => {
  it("uses sale in the seller dialog and admin funnel", () => {
    expect(dialog).toContain('label="Продажа"');
    expect(dialog).toContain('handleOutcome("sale")');
    expect(dialog).not.toContain("project_offered");
    expect(funnel).toContain('label="Продажи"');
    expect(funnel).toContain('sale: "Продажа"');
    expect(admin).toContain('sale: "Продажа"');
    expect(admin).toContain("outcome IN ('sale', 'project_offered')");
  });
});
