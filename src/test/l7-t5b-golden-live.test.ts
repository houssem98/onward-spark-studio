import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { deepseek } from "@/lib/deepseek.server";
import { report, runGolden, summarize, type GoldenQuestion } from "@/lib/golden";
import type { ModelClient } from "@/lib/model";
import { demoRepo } from "@/repo/demo";

// L7 T5b: the v2 holdout through the live model, which calls DeepSeek and so runs only when asked:
// `GOLDEN_LIVE=1` with `DEEPSEEK_API_KEY` set (`node --env-file=.env`). The kept drafts and the tool
// results each is judged against go to `GOLDEN_DRAFTS`, a file outside the repo, for the judge.
const SET = JSON.parse(readFileSync("evals/golden-v2.json", "utf8")) as {
  questions: GoldenQuestion[];
};
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const RUNS = 3;
const holdout = SET.questions.filter((x) => x.split === "holdout");

describe("golden v2 for the judge (L7 T5b)", () => {
  it("keeps beside each draft the tool results it is judged against", async () => {
    const writer: ModelClient = async ({ question }) => ({
      text: "Revenue missed target.",
      calls: [{ name: "finance_answer", args: { question } }],
    });
    const [row] = await runGolden(holdout.slice(0, 1), {
      runs: 1,
      model: writer,
      repo: demoRepo,
      user: CRO,
    });
    expect(row!.results).toHaveLength(1);
    expect(row!.results[0]).toMatchObject({ name: "finance_answer", result: expect.anything() });
  });

  it.skipIf(process.env["GOLDEN_LIVE"] !== "1")(
    `shows no unsupported verified claim in the holdout over ${RUNS} live runs`,
    async () => {
      const key = process.env["DEEPSEEK_API_KEY"];
      expect(key).toBeTruthy();
      const rows = await runGolden(holdout, {
        runs: RUNS,
        model: deepseek(key!),
        repo: demoRepo,
        user: CRO,
      });
      console.log(report(rows, { holdout: true }));
      const out = process.env["GOLDEN_DRAFTS"];
      if (out) writeFileSync(out, JSON.stringify(rows, null, 2));
      const hold = summarize(rows);
      expect(hold.n).toBe(7 * RUNS);
      expect(hold.unsupportedVerified).toBe(0);
    },
    300_000,
  );
});
