import { describe, expect, it, vi } from "vitest";

import { handleAsk, handleSpend } from "@/lib/ask.server";
import { deepseek } from "@/lib/deepseek.server";
import type { ModelClient } from "@/lib/model";
import { supabaseSpend, type SpendStore } from "@/lib/spend.server";
import { demoRepo } from "@/repo/demo";

// L7 T6e (the council's F10 and F11): a call the provider billed is recorded whatever happens to its
// reply, and each organisation's month counts only its own calls.
const NOW = new Date("2026-11-09T02:00:00Z");
const post = () =>
  new Request("http://x/api/ask", {
    method: "POST",
    body: JSON.stringify({ question: "How did credit do?", domain: "performance" }),
  });
const store = (): SpendStore & { record: ReturnType<typeof vi.fn> } => ({
  record: vi.fn(async () => {}),
  month: vi.fn(async () => 0),
});
const usage = { prompt_cache_miss_tokens: 1_000_000, completion_tokens: 1_000_000 };

describe("spend records (L7 T6e)", () => {
  it("records a billed call whose reply cannot be read", async () => {
    const reply = {
      choices: [
        {
          message: {
            content: "",
            tool_calls: [{ function: { name: "finance_answer", arguments: "{bad" } }],
          },
        },
      ],
      usage,
    };
    const s = store();
    const res = await handleAsk(post(), {
      key: "k",
      repo: demoRepo,
      model: deepseek("k", async () => Response.json(reply)),
      store: s,
      now: () => NOW,
    });
    expect(res.status).toBe(502);
    expect(s.record).toHaveBeenCalledWith(expect.objectContaining({ usd: 1.5 }));
  });

  it("records a billed call when a tool fails after the model answered", async () => {
    const model: ModelClient = async () => ({
      text: "",
      calls: [{ name: "finance_answer", args: { question: "How did credit do?" } }],
      usage: { cacheHit: 0, cacheMiss: 1_000_000, output: 1_000_000 },
    });
    const broken = {
      ...demoRepo,
      finance: {
        ...demoRepo.finance,
        read: async () => {
          throw new Error("finance down");
        },
      },
    };
    const s = store();
    const res = await handleAsk(post(), {
      key: "k",
      repo: broken,
      model,
      store: s,
      now: () => NOW,
    });
    expect(res.status).toBe(502);
    expect(s.record).toHaveBeenCalledWith(expect.objectContaining({ usd: 1.5 }));
  });

  it("records each call with the caller's organisation and sums only that organisation's month", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const filters: unknown[][] = [];
    const page = { order: () => ({ range: async () => ({ data: [], error: null }) }) };
    const gte = () => ({
      eq: (...a: unknown[]) => (filters.push(["eq", ...a]), page),
      is: (...a: unknown[]) => (filters.push(["is", ...a]), page),
    });
    const s = supabaseSpend({ from: () => ({ insert, select: () => ({ gte }) }) });
    await s.record({ at: NOW.toISOString(), actor: "a", model: "m", usd: 1, org_id: "org-a" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ org_id: "org-a" }));
    await s.month(NOW, "org-a");
    await s.month(NOW);
    expect(filters).toEqual([
      ["eq", "org_id", "org-a"],
      ["is", "org_id", null],
    ]);
  });

  it("asks the store for the caller's own organisation's month", async () => {
    const s = store();
    const repo = {
      ...demoRepo,
      session: { read: async () => ({ user: { name: "A", role: "Admin", org: "org-a" } }) },
    };
    await handleSpend(new Request("http://x/api/ask"), { repo, store: s, now: () => NOW });
    expect(s.month).toHaveBeenCalledWith(NOW, "org-a");
  });
});
