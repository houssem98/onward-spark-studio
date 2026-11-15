import { answer } from "@/lib/copilot";
import type { EvidenceState } from "@/lib/evidence";
import { isVerified } from "@/lib/evidence-policy";
import { ask, costOf, vetDraft, type Domain, type ModelClient } from "@/lib/model";
import type { Repository, User } from "@/repo/types";

// The golden evaluation (L7 T5): the pre-registered questions in `evals/golden-v1.json` run through
// `ask`, scored against values written from the fixtures, never against the code's own output.

export interface GoldenQuestion {
  id: string;
  split: "improvement" | "holdout";
  domain: Domain;
  question: string;
  tool: string;
  values: string[];
  state: EvidenceState | null;
}

const verified = (s: EvidenceState | null) => s !== null && isVerified(s);

type Asked = { refused: string } | { text: string; results: { name: string; result?: unknown }[] };
type Cites = { cited: number; precise: number };

/** The system with no language model: the domain's one tool, asked the question as written. */
export const routing: ModelClient = async ({ question, tools }) => ({
  text: "",
  calls: tools.slice(0, 1).map((t) => ({ name: t.name, args: { question } })),
});

export function score(q: GoldenQuestion, out: Asked, cites: Cites, ms: number, usd: number) {
  const results = "refused" in out ? [] : out.results;
  const first = results[0];
  const json = JSON.stringify(results);
  const found = q.values.filter((v) => json.includes(v)).length;
  const state = (first?.result as { state?: EvidenceState } | undefined)?.state ?? null;
  const shownFails =
    "text" in out && !!out.text && vetDraft(out.text, q.question, results) !== null;
  return {
    id: q.id,
    split: q.split,
    toolOk: first?.name === q.tool,
    found,
    expected: q.values.length,
    state,
    unsupported: (verified(state) && (!verified(q.state) || found < q.values.length)) || shownFails,
    ...cites,
    ms,
    usd,
  };
}
export type GoldenRow = ReturnType<typeof score> & { run: number };

type Data = Parameters<typeof answer>[1];

// A citation is precise when the cited source gives the claim's own value. Read from the finance
// answer to the question as written.
function cites(q: GoldenQuestion, data: Data): Cites {
  const out = { cited: 0, precise: 0 };
  if (q.tool !== "finance_answer") return out;
  for (const a of answer(q.question, data).assessments)
    for (const s of a.sources) {
      out.cited++;
      if (a.values?.some((v) => v.sourceId === s.id && v.value === a.claimed)) out.precise++;
    }
  return out;
}

export async function runGolden(
  qs: GoldenQuestion[],
  ctx: { runs: number; model: ModelClient; repo: Repository; user: User; now?: () => Date },
) {
  const data = {
    finance: await ctx.repo.finance.read(),
    models: await ctx.repo.models.read(),
    datasets: await ctx.repo.datasets.read(),
    crime: await ctx.repo.crime.read(),
  };
  const rows: GoldenRow[] = [];
  for (let run = 1; run <= ctx.runs; run++)
    for (const q of qs) {
      const t0 = performance.now();
      const out = await ask({ question: q.question, domain: q.domain }, ctx);
      const ms = performance.now() - t0;
      const usd = "usage" in out && out.usage ? costOf(out.usage, ctx.now?.() ?? new Date()) : 0;
      rows.push({ run, ...score(q, out, cites(q, data), ms, usd) });
    }
  return rows;
}

/** Each metric with n answers over q questions; a standard error counts only the questions that
 * contribute to its metric (see the set's rules). */
export function summarize(rows: GoldenRow[]) {
  const qOf = (f: (r: GoldenRow) => number) => new Set(rows.filter(f).map((r) => r.id)).size;
  const sum = (f: (r: GoldenRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const prop = (num: number, den: number, q: number) => {
    const p = den ? num / den : NaN;
    return { p, q, se: Math.sqrt((p * (1 - p)) / q) };
  };
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  return {
    q: qOf(() => 1),
    n: rows.length,
    toolAccuracy: prop(
      sum((r) => +r.toolOk),
      rows.length,
      qOf(() => 1),
    ),
    calcAccuracy: prop(
      sum((r) => r.found),
      sum((r) => r.expected),
      qOf((r) => r.expected),
    ),
    citationPrecision: prop(
      sum((r) => r.precise),
      sum((r) => r.cited),
      qOf((r) => r.cited),
    ),
    unsupportedVerified: sum((r) => +r.unsupported),
    medianMs: ms[Math.floor(ms.length / 2)] ?? NaN,
    usd: sum((r) => r.usd),
  };
}

const pct = (x: { p: number; q: number; se: number }) =>
  Number.isNaN(x.p) ? "n/a" : `${(x.p * 100).toFixed(1)}% ± ${(x.se * 100).toFixed(1)} (q=${x.q})`;

export function report(rows: GoldenRow[]) {
  return (["improvement", "holdout"] as const)
    .map((split) => {
      const s = summarize(rows.filter((r) => r.split === split));
      return `${split}: q=${s.q} n=${s.n} · tool ${pct(s.toolAccuracy)} · calculation ${pct(s.calcAccuracy)} · citation precision ${pct(s.citationPrecision)} · unsupported verified ${s.unsupportedVerified} · median ${s.medianMs.toFixed(1)} ms · cost $${s.usd.toFixed(6)}`;
    })
    .join("\n");
}
