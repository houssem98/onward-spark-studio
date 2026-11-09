import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { EVIDENCE_STATES } from "@/lib/evidence";

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
  // Retired in L1 T11 after the T7 council.
  "Customer identifiers are pseudonymous",
  '"Generate report",',
  "scenario logic is documented under governance",
  "Every simulated change made in this session is recorded here",
  "Volume = ΔVolume × benchmark yield",
  'source="Synthetic alert queue (demo data)"',
];

describe("honest copy", () => {
  it("retires every claim the product cannot back", () => {
    const found = sources.flatMap((f) =>
      RETIRED.filter((p) => text(f).includes(p)).map((p) => `${f}: "${p}"`),
    );
    expect(found).toEqual([]);
  });

  // L11 T3: an explanation describes how the model scored a case, never what caused the outcome.
  it("words every explanation as the model's behaviour, never as a cause", () => {
    // "causes" too, but not the caveat's own "not causes" (L11 T10, council C7).
    const CAUSAL =
      /\b(because|due to|(?<!not )causes?|caused|causing|drove|drives|driven by|led to|leads to|results? in|resulted in|reason for|responsible for|therefore|pushes|pushed)\b/i;
    const route = text("src/routes/models.$id.tsx");
    const start = route.indexOf('<TabsContent value="explainability"');
    // Every file that carries explanation copy, and the route's explainability tab alone, since
    // its other tabs describe the monitoring system, not a model's behaviour.
    const copy: Record<string, string> = {
      "src/lib/explain.ts": text("src/lib/explain.ts"),
      "src/components/explain.tsx": text("src/components/explain.tsx"),
      "src/components/charts.tsx": text("src/components/charts.tsx"),
      "src/data/explanations.ts": text("src/data/explanations.ts"),
      "src/routes/models.$id.tsx (explainability tab)": route.slice(
        start,
        route.indexOf("</TabsContent>", start),
      ),
    };
    expect(copy["src/routes/models.$id.tsx (explainability tab)"]!.length).toBeGreaterThan(500);
    expect(
      Object.entries(copy)
        .filter(([, t]) => CAUSAL.test(t))
        .map(([f]) => f),
    ).toEqual([]);
    expect(text("src/lib/explain.ts")).toContain(
      "Contributions describe how the model scored this case, not causes",
    );
    expect(text("src/lib/explain.ts")).toContain("decision support, not a credit decision");
  });

  it("labels the wizard's fixed validation results as fixed", () => {
    expect(text("src/routes/performance.tsx")).toContain("These results are fixed in this demo");
  });

  it("says on every evidence-state explanation that the state comes from the sample data", () => {
    const kit = text("src/components/kit.tsx");
    expect(kit).toMatch(
      /const SAMPLE =\s*"[^"]*In this demo the policy sets the state from facts written into the synthetic sample data/,
    );
    expect([...kit.matchAll(/\bdesc: "/g)]).toHaveLength(EVIDENCE_STATES.length);
    expect([...kit.matchAll(/\bdesc: "[^"]*" \+ SAMPLE,/g)]).toHaveLength(EVIDENCE_STATES.length);
  });
});
