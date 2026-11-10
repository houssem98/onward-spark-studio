import { describe, expect, it, vi } from "vitest";

import { handleAsk, handleSpend } from "@/lib/ask.server";
import { deepseek } from "@/lib/deepseek.server";
import { PRICE, costOf, spendAlert, type ModelClient } from "@/lib/model";
import { supabaseSpend, type SpendStore } from "@/lib/spend.server";
import { demoRepo } from "@/repo/demo";

const req = { system: "s", question: "q", tools: [] };
const usage = {
  prompt_cache_hit_tokens: 1000,
  prompt_cache_miss_tokens: 2000,
  completion_tokens: 500,
};

describe("usage and cost (L7 T2b)", () => {
  it("reads usage from the reply, on deepseek-flash with thinking off", async () => {
    const f = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ choices: [{ message: { content: "x" } }], usage })),
    );
    const turn = await deepseek("sk-test-key", f)(req);
    expect(turn.usage).toEqual({ cacheHit: 1000, cacheMiss: 2000, output: 500 });
    expect(JSON.parse(f.mock.calls[0]![1]!.body as string)).toMatchObject({
      model: "deepseek-flash",
      thinking: { type: "disabled" },
    });
  });

  it("prices a call at the dated rates, half off-peak", () => {
    expect(PRICE).toMatchObject({ model: "deepseek-flash", hit: 0.006, miss: 0.3, output: 1.2 });
    const u = { cacheHit: 1000, cacheMiss: 2000, output: 500 };
    // Monday 02:00 UTC is peak; Saturday is off-peak.
    expect(costOf(u, new Date("2026-11-09T02:00:00Z"))).toBeCloseTo(0.001206, 9);
    expect(costOf(u, new Date("2026-11-14T12:00:00Z"))).toBeCloseTo(0.000603, 9);
    expect(costOf(u, new Date("2026-11-09T05:00:00Z"))).toBeCloseTo(0.000603, 9);
  });

  it("alerts above $5 in the month and not at or below it", () => {
    expect(spendAlert(4.99)).toBeNull();
    expect(spendAlert(5)).toBeNull();
    expect(spendAlert(5.01)).toMatch(/\$5\.01.*above the \$5 alert.*not blocked/);
  });
});

const store = (month: number): SpendStore & { record: ReturnType<typeof vi.fn> } => ({
  record: vi.fn(async () => {}),
  month: vi.fn(async () => month),
});
const model: ModelClient = async () => ({
  text: "draft",
  calls: [],
  usage: { cacheHit: 0, cacheMiss: 1_000_000, output: 1_000_000 },
});
const post = (body: unknown) =>
  new Request("http://x/api/ask", { method: "POST", body: JSON.stringify(body) });
const NOW = new Date("2026-11-09T02:00:00Z");

describe("the ask route records spend and alerts, never blocking (L7 T2b)", () => {
  it("records each call's cost and returns the month's alert", async () => {
    const s = store(6);
    const res = await handleAsk(post({ question: "How did credit do?", domain: "performance" }), {
      key: "k",
      repo: demoRepo,
      model,
      store: s,
      now: () => NOW,
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(s.record).toHaveBeenCalledWith(
      expect.objectContaining({ usd: 1.5, model: "deepseek-flash" }),
    );
    expect(body.spend).toMatchObject({ usd: 1.5, monthUsd: 6 });
    expect(body.spend.alert).toMatch(/above the \$5 alert/);
  });

  it("answers, and says spend is not tracked, when no store is configured", async () => {
    const res = await handleAsk(post({ question: "How did credit do?", domain: "performance" }), {
      key: "k",
      repo: demoRepo,
      model,
      store: null,
      now: () => NOW,
    });
    const body = await res.json();
    expect(body.text).toBe("draft");
    expect(body.spend.untracked).toMatch(/not tracked/);
  });

  it("shows the month's spend only to an admin or the chief risk officer", async () => {
    const asRole = (role: string) => ({
      ...demoRepo,
      session: { read: async () => ({ user: { name: "n", role } }) },
    });
    const get = new Request("http://x/api/ask");
    const cro = await handleSpend(get, {
      repo: asRole("Chief Risk Officer"),
      store: store(7),
      now: () => NOW,
    });
    expect(await cro.json()).toMatchObject({
      monthUsd: 7,
      alert: expect.stringMatching(/\$7\.00/),
    });
    const analyst = await handleSpend(get, {
      repo: asRole("Credit analyst"),
      store: store(7),
      now: () => NOW,
    });
    expect(analyst.status).toBe(403);
  });
});

describe("the Supabase spend store (L7 T2b)", () => {
  it("inserts a call and sums the month's calls", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const gte = vi.fn(async () => ({ data: [{ usd: 2 }, { usd: 3.5 }], error: null }));
    const client = { from: vi.fn(() => ({ insert, select: () => ({ gte }) })) };
    const s = supabaseSpend(client);
    await s.record({ at: NOW.toISOString(), actor: "a", model: "deepseek-flash", usd: 1 });
    expect(client.from).toHaveBeenCalledWith("model_calls");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ usd: 1 }));
    expect(await s.month(NOW)).toBe(5.5);
    expect(gte).toHaveBeenCalledWith("at", "2026-11-01T00:00:00.000Z");
  });
});
