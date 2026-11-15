import { describe, expect, it, vi } from "vitest";

import { handleAsk } from "@/lib/ask.server";
import { callTool, screen, spendAlert, vetDraft, type ModelClient } from "@/lib/model";
import { supabaseSpend } from "@/lib/spend.server";
import { demoRepo } from "@/repo/demo";

// L7 T6: the council's findings reproduced as failing tests (F1, F3, F5, F7, F9).
const ANALYST = { name: "G. Rossi", role: "Credit analyst" };
const NOW = new Date("2026-11-09T02:00:00Z");

describe("the council's findings (L7 T6)", () => {
  it("F1: sums every row of the month even when the server caps a read at 1,000 rows", async () => {
    const rows = Array.from({ length: 2_500 }, () => ({ usd: 0.004 }));
    const range = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, Math.min(to + 1, from + 1_000)),
      error: null,
    }));
    const client = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({
          gte: () => ({
            eq: () => ({ order: () => ({ range }) }),
            is: () => ({ order: () => ({ range }) }),
          }),
        }),
      }),
    };
    const usd = await supabaseSpend(client).month(NOW);
    expect(usd).toBeCloseTo(10, 6);
    expect(spendAlert(usd)).not.toBeNull();
  });

  it("F3: the finance tool answers only performance questions, whatever the model asks it", async () => {
    for (const question of [
      "Summarize the highest-priority open fraud cases.",
      "Which models have overdue validation reviews?",
      "Which datasets affect this executive report?",
    ]) {
      const r = await callTool(
        { name: "finance_answer", args: { question } },
        { user: ANALYST, domain: "performance", repo: demoRepo },
      );
      expect(JSON.stringify(r), question).not.toMatch(/CASE-|MDL-|DS-0/);
      expect(r.result, question).toMatchObject({ refused: expect.stringMatching(/performance/) });
    }
  });

  it("F5: stops card and account numbers written with spaces or dashes before the model", () => {
    for (const q of [
      "Why was card 4111 1111 1111 1111 declined?",
      "Why was card 4111-1111-1111-1111 declined?",
      "Check GB82 WEST 1234 5698 7654 32 please",
      "Check GB29 NWBK 6016 1331 9268 19 please",
      "Check TN59-1000-6035-1835-9847-8831 please",
    ])
      expect(screen(q), q).not.toBeNull();
    for (const q of [
      "How did FY2024-2025 revenue compare?",
      "Why did our FY2025 net interest margin fall?",
    ])
      expect(screen(q), q).toBeNull();
  });

  it("F7: withholds a draft naming any evidence state, however it is written", () => {
    for (const text of [
      "This is a hypothesis.",
      "These figures are still a draft.",
      "Conflicting-evidence was found.",
      "Partially-verified figures follow.",
    ])
      expect(vetDraft(text, "q", []), text).toMatch(/evidence state/);
  });

  it("F9: a call returns the month's spend and alert only to the roles that may see them", async () => {
    const model: ModelClient = async () => ({
      text: "",
      calls: [],
      usage: { cacheHit: 0, cacheMiss: 1_000_000, output: 1_000_000 },
    });
    const repo = { ...demoRepo, session: { read: async () => ({ user: ANALYST }) } };
    const res = await handleAsk(
      new Request("http://x/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "How did credit do?", domain: "performance" }),
      }),
      {
        key: "k",
        repo,
        model,
        store: { record: async () => {}, month: async () => 7 },
        now: () => NOW,
      },
    );
    const body = await res.json();
    expect(body.spend).toEqual({ usd: 1.5 });
  });
});
