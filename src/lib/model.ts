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
export type ModelClient = (req: {
  system: string;
  question: string;
  tools: ToolSpec[];
}) => Promise<{ text: string; calls: ToolCall[] }>;

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
  return { text: turn.text, results };
}
