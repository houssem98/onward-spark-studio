import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { handleAsk } from "@/lib/ask.server";
import { ask, toolsFor, type ModelClient } from "@/lib/model";
import { readSector } from "@/lib/tn-connector.server";
import { demoRepo } from "@/repo/demo";
import type { Repository } from "@/repo/types";

// L7 T9: the model may read the listed Tunisian banks' latest quarter, public filings the human let
// leave the bank (2026-11-16), in the demo and in production. Recorded on 2026-11-10: BIAT's listing
// and statement and the BCT's rate; every other bank answers 404. No test reads a live site.
const rec = (f: string) => readFileSync(`src/test/recorded/tn/${f}`);
const ok = (body: BodyInit) => new Response(body, { status: 200 });
const recorded = vi.fn<typeof fetch>(async (u) => {
  const url = String(u);
  if (url.includes("bct.gov.tn")) return ok(rec("bct-usd-2026-09-30.html"));
  if (url.endsWith(".pdf")) return ok(rec("biat-q3-2026.pdf"));
  if (url.includes("type_societe=3126")) return ok(rec("biat-listing.html"));
  return new Response("", { status: 404 });
});
const sector = () =>
  readSector({
    fetch: recorded,
    sleep: async () => {},
    now: () => new Date("2026-11-10T09:00:00Z"),
  });
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const Q = "How does BIAT's net banking income compare with the other listed Tunisian banks?";
const production: Repository = { ...demoRepo, environment: "production" };
const writing =
  (draft: string): ModelClient =>
  async (req) =>
    req.read
      ? { text: draft, calls: [] }
      : {
          text: "",
          calls: [
            { name: "tn_sector", args: {} },
            { name: "finance_answer", args: { question: Q } },
          ],
        };

describe("the Tunisian sector tool (L7 T9)", () => {
  it("is offered for performance questions to every role", () => {
    for (const role of ["Chief Risk Officer", "Investigator", "Reviewer"])
      expect(toolsFor({ name: "x", role }, "performance").map((t) => t.name)).toContain(
        "tn_sector",
      );
  });

  it("returns each read bank's figures as the page shows them, with the policy's state", async () => {
    const r = await ask(
      { question: Q, domain: "performance" },
      { user: CRO, repo: demoRepo, model: writing(""), sector },
    );
    if ("refused" in r) throw new Error(r.refused);
    const banks = r.results[0]!.result as {
      bank: string;
      figures?: { label: string; usd: string; state: string }[];
      notRead?: string;
    }[];
    const biat = banks.find((b) => b.bank === "BIAT")!;
    expect(biat.figures).toContainEqual({
      label: "Net banking income",
      usd: "$415.1M",
      state: "VERIFIED",
    });
    expect(banks.find((b) => b.bank === "BH Bank")!.notRead).toMatch(/404/);
  });

  it("reaches the model in production, where the bank's own data still does not", async () => {
    const r = await ask(
      { question: Q, domain: "performance" },
      { user: CRO, repo: production, model: writing(""), sector },
    );
    if ("refused" in r) throw new Error(r.refused);
    expect(r.results.map((x) => [x.name, "result" in x])).toEqual([
      ["tn_sector", true],
      ["finance_answer", false],
    ]);
  });

  it("lets a draft restate a filed figure and withholds one the filings do not hold", async () => {
    const run = (draft: string) =>
      ask(
        { question: Q, domain: "performance" },
        { user: CRO, repo: demoRepo, model: writing(draft), sector },
      );
    const good = await run("BIAT's net banking income was $415.1M.");
    const bad = await run("BIAT's net banking income was $415.0M.");
    if ("refused" in good || "refused" in bad) throw new Error("refused");
    expect([good.text, good.withheld]).toEqual([expect.stringContaining("$415.1M"), undefined]);
    expect(bad.withheld).toMatch(/withheld/);
  });

  it("refuses where no filings reader is given, as in the browser", async () => {
    const r = await ask(
      { question: Q, domain: "performance" },
      { user: CRO, repo: demoRepo, model: writing("") },
    );
    if ("refused" in r) throw new Error(r.refused);
    expect(r.results[0]).toMatchObject({
      name: "tn_sector",
      result: { refused: expect.stringMatching(/server/) },
    });
  });

  it("is given the filings reader by the server's door", async () => {
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify({ question: Q, domain: "performance" }),
    });
    const res = await handleAsk(request, {
      key: "test-key",
      repo: demoRepo,
      store: null,
      now: () => new Date("2026-11-10T09:00:00Z"),
      model: writing(""),
      sector,
    });
    const body = (await res.json()) as { results: { name: string; result?: unknown }[] };
    expect(JSON.stringify(body.results[0]!.result)).toContain("$415.1M");
  });
});
