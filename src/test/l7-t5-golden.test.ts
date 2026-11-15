import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { report, routing, runGolden, score, summarize, type GoldenQuestion } from "@/lib/golden";
import { demoRepo } from "@/repo/demo";

// L7 T5: this file is the golden script. `npx vitest run src/test/l7-t5-golden.test.ts` prints the
// metrics and exits non-zero when the holdout shows any unsupported verified claim.
const SET = JSON.parse(readFileSync("evals/golden-v1.json", "utf8")) as {
  version: number;
  frozen: string;
  questions: GoldenQuestion[];
};
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const RUNS = 3;
const NONE = { cited: 0, precise: 0 };

describe("golden evaluation (L7 T5)", () => {
  it("holds a versioned set split by domain before any run", () => {
    expect([SET.version, SET.frozen]).toEqual([1, "2026-11-15"]);
    for (const d of ["performance", "models", "data"])
      for (const s of ["improvement", "holdout"])
        expect(
          SET.questions.some((q) => q.domain === d && q.split === s),
          `${d} ${s}`,
        ).toBe(true);
    expect(new Set(SET.questions.map((q) => q.id)).size).toBe(SET.questions.length);
  });

  it("counts a VERIFIED answer its expected values do not support, and a shown draft the check would withhold", () => {
    const q = SET.questions.find((x) => x.id === "P4")!;
    const answer = (state: string, text = "") => ({
      text,
      results: [{ name: "finance_answer", result: { state, metrics: [] } }],
    });
    expect(score(q, answer("VERIFIED"), NONE, 0, 0).unsupported).toBe(true);
    expect(
      score(q, answer("PARTIALLY_VERIFIED", "Revenue was $999.0M."), NONE, 0, 0).unsupported,
    ).toBe(true);
    expect(score(q, answer("PARTIALLY_VERIFIED"), NONE, 0, 0).unsupported).toBe(false);
  });

  it(`shows no unsupported verified claim in the holdout over ${RUNS} runs, with no language model`, async () => {
    const rows = await runGolden(SET.questions, {
      runs: RUNS,
      model: routing,
      repo: demoRepo,
      user: CRO,
    });
    console.log(report(rows));
    const hold = summarize(rows.filter((r) => r.split === "holdout"));
    expect(hold.n).toBe(7 * RUNS);
    expect(hold.unsupportedVerified).toBe(0);
    expect([hold.toolAccuracy.p, hold.calcAccuracy.p]).toEqual([1, 1]);
  });
});
