import type { EvidenceState } from "@/lib/evidence";
import { isVerified } from "@/lib/evidence-policy";
import { ask, costOf, vetDraft, type Domain, type ModelClient } from "@/lib/model";
import type { Repository, User } from "@/repo/types";

// The golden evaluation (L7 T5, v2 in T6d): pre-registered questions in `evals/` run through `ask`,
// scored against values written from the fixtures, never against the code's own output.

export interface GoldenQuestion {
  id: string;
  split: "improvement" | "holdout";
  domain: Domain;
  question: string;
  tool: string;
  values: string[];
  /** Values a correct answer must not hold (v2). */
  absent?: string[];
  state: EvidenceState | null;
}

const verified = (s: EvidenceState | null | undefined) => !!s && isVerified(s);

type Result = { name: string; result?: unknown; refused?: string };
type Asked = { refused: string } | { text: string; withheld?: string; results: Result[] };
type Citation = { claimed: number; value: number | null };

/** The system with no language model: the domain's one tool, asked the question as written. */
export const routing: ModelClient = async ({ question, tools }) => ({
  text: "",
  calls: tools.slice(0, 1).map((t) => ({ name: t.name, args: { question } })),
});

/** One answer scored; every tool result is read, and citations are the ones the tools returned. */
export function score(q: GoldenQuestion, out: Asked, ms: number, usd: number, draft = "") {
  const results = "refused" in out ? [] : out.results;
  const json = JSON.stringify(results);
  const has = (v: string) => json.includes(v);
  const found = q.values.filter(has).length;
  const states = results.map((r) => (r.result as { state?: EvidenceState } | undefined)?.state);
  const shownFails =
    "text" in out && !!out.text && vetDraft(out.text, q.question, results) !== null;
  const citations = results.flatMap(
    (r) => (r.result as { citations?: Citation[] } | undefined)?.citations ?? [],
  );
  return {
    id: q.id,
    split: q.split,
    toolOk: results.some((r) => r.name === q.tool && "result" in r),
    found,
    expected: q.values.length,
    wrong: (q.absent ?? []).filter(has).length,
    unsupported:
      (states.some(verified) && (!verified(q.state) || found < q.values.length)) || shownFails,
    cited: citations.length,
    precise: citations.filter((c) => c.value === c.claimed).length,
    draft,
    withheld: "withheld" in out && !!out.withheld,
    ms,
    usd,
  };
}
export type GoldenRow = ReturnType<typeof score> & { run: number; results: Result[] };

export async function runGolden(
  qs: GoldenQuestion[],
  ctx: { runs: number; model: ModelClient; repo: Repository; user: User; now?: () => Date },
) {
  const rows: GoldenRow[] = [];
  for (let run = 1; run <= ctx.runs; run++)
    for (const q of qs) {
      // The draft as the model wrote it, before the draft check can withhold it.
      let draft = "";
      const model: ModelClient = async (req) => {
        const turn = await ctx.model(req);
        draft = turn.text;
        return turn;
      };
      const t0 = performance.now();
      const out = await ask({ question: q.question, domain: q.domain }, { ...ctx, model });
      const ms = performance.now() - t0;
      const usd = "usage" in out && out.usage ? costOf(out.usage, ctx.now?.() ?? new Date()) : 0;
      // The tool results stay beside the draft: the judge (T5b) reads one against the other.
      rows.push({
        run,
        ...score(q, out, ms, usd, draft),
        results: "refused" in out ? [] : out.results,
      });
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
    exactness: prop(
      sum((r) => +(r.wrong === 0)),
      rows.length,
      qOf(() => 1),
    ),
    citationPrecision: prop(
      sum((r) => r.precise),
      sum((r) => r.cited),
      qOf((r) => r.cited),
    ),
    unsupportedVerified: sum((r) => +r.unsupported),
    drafts: { written: sum((r) => +!!r.draft), withheld: sum((r) => +r.withheld) },
    medianMs: ms[Math.floor(ms.length / 2)] ?? NaN,
    usd: sum((r) => r.usd),
  };
}

const pct = (x: { p: number; q: number; se: number }) =>
  Number.isNaN(x.p) ? "n/a" : `${(x.p * 100).toFixed(1)}% ± ${(x.se * 100).toFixed(1)} (q=${x.q})`;

/** The improvement split's metrics; the holdout's only when asked, so tuning never reads them. */
export function report(rows: GoldenRow[], { holdout = false } = {}) {
  return (holdout ? (["improvement", "holdout"] as const) : (["improvement"] as const))
    .map((split) => {
      const s = summarize(rows.filter((r) => r.split === split));
      return `${split}: q=${s.q} n=${s.n} · tool ${pct(s.toolAccuracy)} · calculation ${pct(s.calcAccuracy)} · exactness ${pct(s.exactness)} · citation precision ${pct(s.citationPrecision)} · unsupported verified ${s.unsupportedVerified} · drafts ${s.drafts.written} written, ${s.drafts.withheld} withheld · median ${s.medianMs.toFixed(1)} ms · cost $${s.usd.toFixed(6)}`;
    })
    .join("\n");
}
