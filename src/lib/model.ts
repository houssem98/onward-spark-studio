import { answer } from "@/lib/copilot";
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
      return {
        intent: r.intent,
        scope: r.scope,
        metrics: r.metrics,
        state: r.state,
        missing: r.missing,
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
  [/\b[A-Z]{2}\d{2}(?: ?\d{4}){4,}/i, "an account number (IBAN)"],
];

/** Why a question may not be sent to the model; null when it may. */
export function screen(question: string): string | null {
  const hit = SENSITIVE.find(([re]) => re.test(question));
  return hit ? `The question contains ${hit[1]}; it was not sent to the model.` : null;
}

const SYSTEM =
  "You help a bank analyst. Choose the tool that answers the question and summarise what it returns. Never state a figure or an evidence state that a tool did not return.";

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
  return { text: turn.text, results, usage: turn.usage };
}
