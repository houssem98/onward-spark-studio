import { deepseek } from "@/lib/deepseek.server";
import { PRICE, ask, costOf, spendAlert, type Domain, type ModelClient } from "@/lib/model";
import type { SpendStore } from "@/lib/spend.server";
import type { Repository } from "@/repo/types";

// The model's one door, behind /api/ask. The user and role come from the server's session, never
// the request body; spend is recorded and alerted on, and never blocks a call (L7 T1).

const DOMAINS: Domain[] = ["performance", "models", "data"];
const SPEND_ROLES = ["Admin", "Chief Risk Officer"];
const UNTRACKED =
  "Model spend is not tracked: the model_calls table or the server's service key is not configured.";

const refuse = (refused: string, status: number) => Response.json({ refused }, { status });
const crossSite = (r: Request) => {
  const origin = r.headers.get("origin");
  return origin !== null && origin !== new URL(r.url).origin;
};
const userOf = (repo: Repository) =>
  repo.session.read().then(
    (s) => s.user,
    () => null,
  );

export async function handleAsk(
  request: Request,
  deps: {
    key: string | undefined;
    repo: Repository;
    store: SpendStore | null;
    now: () => Date;
    model?: ModelClient;
  },
) {
  if (crossSite(request)) return refuse("Cross-site request.", 403);
  const body = (await request.json().catch(() => null)) as {
    question?: unknown;
    domain?: unknown;
  } | null;
  if (typeof body?.question !== "string" || !DOMAINS.includes(body.domain as Domain))
    return refuse("Send a question and a domain.", 400);
  if (!deps.key) return refuse("The model is not configured.", 503);
  const user = await userOf(deps.repo);
  if (!user) return refuse("Not signed in.", 401);
  let out;
  try {
    out = await ask(
      { question: body.question, domain: body.domain as Domain },
      { user, repo: deps.repo, model: deps.model ?? deepseek(deps.key) },
    );
  } catch (e) {
    return refuse(e instanceof Error ? e.message : "The model failed.", 502);
  }
  if ("refused" in out) return Response.json(out);
  const { usage, ...answer } = out;
  if (!usage)
    return Response.json({ ...answer, spend: { untracked: "The model reported no usage." } });
  const at = deps.now();
  const usd = costOf(usage, at);
  if (!deps.store) return Response.json({ ...answer, spend: { usd, untracked: UNTRACKED } });
  try {
    await deps.store.record({ at: at.toISOString(), actor: user.name, model: PRICE.model, usd });
    const monthUsd = await deps.store.month(at);
    return Response.json({ ...answer, spend: { usd, monthUsd, alert: spendAlert(monthUsd) } });
  } catch (e) {
    const why = e instanceof Error ? e.message : "unknown error";
    return Response.json({ ...answer, spend: { usd, untracked: `Spend not recorded: ${why}` } });
  }
}

export async function handleSpend(
  request: Request,
  deps: { repo: Repository; store: SpendStore | null; now: () => Date },
) {
  if (crossSite(request)) return refuse("Cross-site request.", 403);
  const user = await userOf(deps.repo);
  if (!user) return refuse("Not signed in.", 401);
  if (!SPEND_ROLES.includes(user.role)) return refuse("Only an admin sees model spend.", 403);
  if (!deps.store) return Response.json({ untracked: UNTRACKED });
  const monthUsd = await deps.store.month(deps.now());
  return Response.json({ monthUsd, alert: spendAlert(monthUsd) });
}
