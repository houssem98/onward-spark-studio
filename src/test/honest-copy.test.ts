import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });

// Whitespace-normalized, so a phrase still matches when the formatter wraps it.
const text = (f: string) => readFileSync(join(root, f), "utf8").replace(/\s+/g, " ");
const sources = walk("src").filter(
  (f) => /\.tsx?$/.test(f) && !f.startsWith("src/test/") && !f.startsWith("src/components/ui/"),
);

// Claims about checks, workflows, sanitizing or AI that nothing in the product performs.
const RETIRED = [
  "Verified intelligence",
  "checks passed; reconciled to controls",
  "Arithmetic is computed deterministically",
  "without passing source, period, unit and reconciliation checks",
  "passes the verification workflow and a reviewer signs off",
  "Sanitized",
  "draft report",
  "AI Credit Intelligence",
  "AI Banking Intelligence Platform",
  "other departments will show NOT_AVAILABLE",
  "Request independent validation",
];

describe("honest copy", () => {
  it("retires every claim the product cannot back", () => {
    const found = sources.flatMap((f) =>
      RETIRED.filter((p) => text(f).includes(p)).map((p) => `${f}: "${p}"`),
    );
    expect(found).toEqual([]);
  });

  it("labels the wizard's fixed validation results as fixed", () => {
    expect(text("src/routes/performance.tsx")).toContain("These results are fixed in this demo");
  });

  it("says on every evidence-state explanation that the state comes from the sample data", () => {
    const kit = text("src/components/kit.tsx");
    expect(kit).toMatch(/const SAMPLE =\s*"[^"]*In this demo the state is set in the sample data/);
    expect([...kit.matchAll(/\bdesc: "/g)]).toHaveLength(5);
    expect([...kit.matchAll(/\bdesc: "[^"]*" \+ SAMPLE,/g)]).toHaveLength(5);
  });
});
