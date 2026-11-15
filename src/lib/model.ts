import { answer } from "@/lib/copilot";
import { EVIDENCE_STATES } from "@/lib/evidence";
import type { Repository, User } from "@/repo/types";

// What the model may do: propose a tool and draft text. The tools it is offered depend on the
// signed-in user's role, read on the server, and on the task's domain; nothing else is reachable.

export type Domain = "performance" | "models" | "data";

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}
/** Input tokens served from the provider's cache, input tokens not, and output tokens. */
export interface Usage {
  cacheHit: number;
  cacheMiss: number;
  output: number;
}
export type ModelClient = (req: {
  system: string;
  question: string;
  tools: ToolSpec[];
}) => Promise<{ text: string; calls: ToolCall[]; usage?: Usage }>;

// US dollars per million tokens at peak, read from api-docs.deepseek.com/quick_start/pricing on
// 2026-11-10; the provider may change them, so the date travels with every cost.
export const PRICE = {
  model: "deepseek-flash",
  hit: 0.006,
  miss: 0.3,
  output: 1.2,
  asOf: "2026-11-10",
} as const;

// Peak is 01:00 to 04:00 and 06:00 to 10:00 UTC on weekdays, off-peak half price. Chinese public
// holidays are off-peak too; pricing them at peak can only overstate the spend.
const peak = (at: Date) => {
  const d = at.getUTCDay();
  const h = at.getUTCHours();
  return d > 0 && d < 6 && ((h >= 1 && h < 4) || (h >= 6 && h < 10));
};

export const costOf = (u: Usage, at: Date) =>
  ((u.cacheHit * PRICE.hit + u.cacheMiss * PRICE.miss + u.output * PRICE.output) / 1e6) *
  (peak(at) ? 1 : 0.5);

export const SPEND_ALERT_USD = 5;
/** Who sees model spend; `GET /api/ask` refuses every other role. */
export const SPEND_ROLES = ["Admin", "Chief Risk Officer"];

/** The alert admins see once the month's spend passes the human's threshold; calls are never blocked. */
export const spendAlert = (monthUsd: number) =>
  monthUsd > SPEND_ALERT_USD
    ? `Model spend this month is $${monthUsd.toFixed(2)}, above the $${SPEND_ALERT_USD} alert. Calls are not blocked.`
    : null;

interface Tool extends ToolSpec {
  /** Roles that may use it; absent means any signed-in role. */
  roles?: string[];
  domains: Domain[];
  run(repo: Repository, args: Record<string, unknown>): Promise<unknown>;
}

// The copilot routes questions of every domain; this tool hands back only its performance answers,
// so a question the model rewrites cannot reach models, data or cases through it (L7 T6, F3).
const PERFORMANCE_INTENTS = new Set([
  "Credit performance vs peer group",
  "Business units vs revenue target",
  "Net interest margin change",
  "Generate year-end department review",
  "Scope needed before an answer",
  "Outside the supported scope",
  "Unrecognized question",
]);

const TOOLS: Tool[] = [
  {
    name: "finance_answer",
    description:
      "Figures, evidence state and limits computed from the bank's finance data for a performance question.",
    parameters: {
      type: "object",
      properties: { question: { type: "string" } },
      required: ["question"],
    },
    roles: ["Chief Risk Officer", "Executive", "Credit analyst", "Admin"],
    domains: ["performance"],
    run: async (repo, a) => {
      const r = answer(String(a["question"] ?? ""), {
        finance: await repo.finance.read(),
        models: await repo.models.read(),
        datasets: await repo.datasets.read(),
        crime: await repo.crime.read(),
      });
      if (!PERFORMANCE_INTENTS.has(r.intent))
        return {
          intent: r.intent,
          refused: "finance_answer answers performance questions only.",
        };
      return {
        intent: r.intent,
        scope: r.scope,
        metrics: r.metrics,
        state: r.state,
        missing: r.missing,
        // Each source the answer cites, with the value it gives for the claim, or null when none.
        citations: r.assessments.flatMap((a) =>
          a.sources.map((s) => ({
            claim: a.claim.id,
            claimed: a.claimed,
            source: s.id,
            value: a.values?.find((v) => v.sourceId === s.id)?.value ?? null,
          })),
        ),
      };
    },
  },
  {
    name: "model_inventory",
    description: "The model inventory: each model's id, name, health and next review date.",
    parameters: { type: "object", properties: {} },
    roles: ["Chief Risk Officer", "Model validator", "Admin"],
    domains: ["models"],
    run: async (repo) =>
      (await repo.models.read()).models.map(({ id, name, health, nextReview }) => ({
        id,
        name,
        health,
        nextReview,
      })),
  },
  {
    name: "dataset_catalog",
    description: "The dataset catalogue: each dataset's id, name and certification.",
    parameters: { type: "object", properties: {} },
    domains: ["data"],
    run: async (repo) => {
      const d = await repo.datasets.read();
      return d.datasets.map(({ id, name }) => ({ id, name, certification: d.certification[id] }));
    },
  },
];

export const toolsFor = (user: User, domain: Domain): Tool[] =>
  TOOLS.filter((t) => t.domains.includes(domain) && (!t.roles || t.roles.includes(user.role)));

export async function callTool(
  call: ToolCall,
  ctx: { user: User; domain: Domain; repo: Repository },
): Promise<{ name: string; result?: unknown; refused?: string }> {
  const tool = toolsFor(ctx.user, ctx.domain).find((t) => t.name === call.name);
  if (!tool)
    return {
      name: call.name,
      refused: `${call.name} is not available to ${ctx.user.role} for ${ctx.domain} questions.`,
    };
  // The human's rule (L7 T1): only the question and synthetic data leave the bank.
  if (ctx.repo.environment !== "demo")
    return { name: call.name, refused: "Only synthetic data may be sent to the model." };
  return { name: call.name, result: await tool.run(ctx.repo, call.args) };
}

const SENSITIVE: [RegExp, string][] = [
  [/[^\s@]+@[^\s@]+\.[^\s@]+/, "an email address"],
  [/\d{8,}/, "a long number that may identify an account, a card or a person"],
  // Card numbers as written: blocks of four, or Amex's 4-6-5, split by spaces or dashes.
  [/\b\d{4}(?:[ -]\d{4}){2,}\b|\b\d{4}[ -]\d{6}[ -]\d{5}\b/, "a card number"],
  [/\b[A-Z]{2}\d{2}(?:[ -]?\d{4}){4,}/i, "an account number (IBAN)"],
  // An IBAN whose bank code holds letters (GB82 WEST …); upper case only, so FY2025 stays a year.
  [/\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]{4}){3,7}(?:[ -]?[A-Z0-9]{1,3})?\b/, "an account number (IBAN)"],
];

/** Why a question may not be sent to the model; null when it may. */
export function screen(question: string): string | null {
  const hit = SENSITIVE.find(([re]) => re.test(question));
  return hit ? `The question contains ${hit[1]}; it was not sent to the model.` : null;
}

const SYSTEM =
  "You help a bank analyst. Choose the tool that answers the question and summarise what it returns in plain words. Repeat only figures a tool returned, written as the tool wrote them, and never name an evidence state: the application shows it.";

export async function ask(
  input: { question: string; domain: Domain },
  ctx: { user: User; repo: Repository; model: ModelClient },
) {
  const refused = screen(input.question);
  if (refused) return { refused };
  const turn = await ctx.model({
    system: SYSTEM,
    question: input.question,
    tools: toolsFor(ctx.user, input.domain).map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    })),
  });
  const results = [];
  for (const c of turn.calls) results.push(await callTool(c, { ...ctx, domain: input.domain }));
  const withheld = vetDraft(turn.text, input.question, results);
  return withheld
    ? { text: "", withheld, results, usage: turn.usage }
    : { text: turn.text, results, usage: turn.usage };
}

// Only the policy sets an evidence state, and only calc gives a figure (L7 T3): a draft that names a
// state, or states a number neither the question nor any tool result holds, is withheld whole.
// Every state the schema knows, longest first, written with spaces, underscores or hyphens.
const STATE = new RegExp(
  `\\b(?:${[...EVIDENCE_STATES]
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/_/g, "[ _-]"))
    .join("|")})\\b`,
  "i",
);
// Figures are read whole (L7 T6b): an id (MDL-002) or a date (2025-11-03) is one token, so its
// digits are never a figure; a figure keeps its sign, currency and unit (−$30.0M, 5.3%, 14bp).
const ATOM = /\b[A-Z]{2,}-\d+\b|\b\d{4}-\d{2}-\d{2}\b/g;
const FIGURE = /(?<![\w.$+−-])([+−-]?)(\$?)(\d+(?:[.,]\d+)*)(%|bp|pp|bn|[MBk])?(?!\w)/g;
const DIGITS = /\d+(?:[.,]\d+)*/g;
const IN_WORDS =
  /\b(?:hundred|thousand|million|billion|trillion|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/i;

const figuresOf = (s: string) =>
  [...s.replace(ATOM, " ").matchAll(FIGURE)].map(([raw, sign, cur, num, unit = ""]) => ({
    raw,
    num: num!,
    body: `${cur}${num}${unit}`,
    signed: sign !== "",
    negative: sign === "-" || sign === "−",
    bare: !sign && !cur && !unit,
  }));

export function vetDraft(text: string, question: string, results: unknown): string | null {
  const state = STATE.exec(text);
  if (state)
    return `The model's draft was withheld: it names an evidence state ("${state[0]}"), which only the evidence policy sets.`;
  const words = IN_WORDS.exec(text);
  if (words)
    return `The model's draft was withheld: it states a figure in words ("${words[0]}"), which no tool returned.`;
  const source = `${question}\n${JSON.stringify(results)}`;
  const atoms = new Set(source.match(ATOM));
  const figures = figuresOf(source);
  const digits = new Set(source.replace(ATOM, " ").match(DIGITS));
  // An unsigned figure may restate a signed one's size ("a gap of $30.0M"); a sign must match.
  const known = (f: ReturnType<typeof figuresOf>[number]) =>
    f.bare
      ? digits.has(f.num)
      : figures.some((k) => k.body === f.body && (!f.signed || k.negative === f.negative));
  const invented = [
    ...(text.match(ATOM) ?? []).filter((a) => !atoms.has(a)),
    ...figuresOf(text)
      .filter((f) => !known(f))
      .map((f) => f.raw),
  ];
  return invented.length
    ? `The model's draft was withheld: it states ${invented.join(", ")}, which no tool returned.`
    : null;
}
