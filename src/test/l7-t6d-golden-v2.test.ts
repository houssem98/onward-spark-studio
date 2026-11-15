import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { report, routing, runGolden, score, summarize, type GoldenQuestion } from "@/lib/golden";
import type { ModelClient } from "@/lib/model";
import { demoRepo } from "@/repo/demo";

// L7 T6d: golden v2 closes the council's F8, F13 and F14. This file is the v2 script:
// `npx vitest run src/test/l7-t6d-golden-v2.test.ts` exits non-zero on any unsupported verified
// claim in the holdout; `GOLDEN_HOLDOUT=1` also prints the holdout's metrics.
const SET = JSON.parse(readFileSync("evals/golden-v2.json", "utf8")) as {
  version: number;
  frozen: string;
  questions: GoldenQuestion[];
};
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const RUNS = 3;
const q = (id: string) => SET.questions.find((x) => x.id === id)!;
const run = (qs: GoldenQuestion[], model: ModelClient, runs = 1) =>
  runGolden(qs, { runs, model, repo: demoRepo, user: CRO });

describe("golden v2 closes v1's blind spots (L7 T6d)", () => {
  it("keeps the draft the model wrote, and whether the check withheld it", async () => {
    const draft = "Credit revenue was $999.0M.";
    const writer: ModelClient = async ({ question }) => ({
      text: draft,
      calls: [{ name: "finance_answer", args: { question } }],
    });
    const [row] = await run([q("P1")], writer);
    expect(row).toMatchObject({ draft, withheld: true, unsupported: false });
    expect(summarize([row!]).drafts).toEqual({ written: 1, withheld: 1 });
  });

  it("reads citations from what the tools returned, so a model that calls no tool cites nothing", async () => {
    const silent: ModelClient = async () => ({ text: "", calls: [] });
    const [none] = await run([q("P1")], silent);
    expect([none!.cited, none!.precise]).toEqual([0, 0]);
    const [routed] = await run([q("P1")], routing);
    expect([routed!.cited, routed!.precise]).toEqual([2, 1]);
  });

  it("reads every tool result, not only the first", () => {
    const out = {
      text: "",
      results: [
        { name: "model_inventory", refused: "not for this domain" },
        { name: "finance_answer", result: { state: "VERIFIED" } },
      ],
    };
    expect(score(q("P5"), out, 0, 0)).toMatchObject({ toolOk: true, unsupported: true });
  });

  it("fails an answer that holds a value it must not", () => {
    const out = {
      text: "",
      results: [
        {
          name: "model_inventory",
          result: [
            { name: "Card Fraud Detection", health: "Watch" },
            { name: "Retail PD Scorecard", health: "Healthy" },
          ],
        },
      ],
    };
    expect(score(q("M4"), out, 0, 0)).toMatchObject({ found: 2, wrong: 1 });
  });

  it("prints the holdout's metrics only when asked", async () => {
    const rows = await run(SET.questions, routing);
    expect(report(rows)).not.toMatch(/holdout/);
    expect(report(rows, { holdout: true })).toMatch(/^holdout:/m);
  });

  it(`shows no unsupported verified claim in the v2 holdout over ${RUNS} runs, with no language model`, async () => {
    expect([SET.version, SET.frozen]).toEqual([2, "2026-11-15"]);
    const rows = await run(SET.questions, routing, RUNS);
    console.log(report(rows, { holdout: process.env["GOLDEN_HOLDOUT"] === "1" }));
    const hold = summarize(rows.filter((r) => r.split === "holdout"));
    expect(hold.n).toBe(7 * RUNS);
    expect(hold.unsupportedVerified).toBe(0);
  });
});
