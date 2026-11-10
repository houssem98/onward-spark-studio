import { readFileSync } from "node:fs";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NAV_GROUPS } from "@/components/AppShell";
import { assignEvidenceState } from "@/lib/evidence-policy";
import { handleSources, supabaseRuns, type SourceRun } from "@/lib/source-runs.server";
import { SOURCES, healthOf } from "@/lib/sources";
import { readLatestUsd } from "@/lib/tn-connector.server";
import { filingAssessment } from "@/lib/tn-filings";
import { open, setUp } from "./a11y";

setUp();

const rec = (f: string) => readFileSync(`src/test/recorded/tn/${f}`);
const ok = (body: BodyInit) => new Response(body, { status: 200 });
const recorded = vi.fn<typeof fetch>(async (u) => {
  const url = String(u);
  if (url.includes("bct.gov.tn")) return ok(rec("bct-usd-2026-09-30.html"));
  if (url.endsWith(".pdf")) return ok(rec("biat-q3-2026.pdf"));
  return ok(rec("biat-listing.html"));
});
const sleep = vi.fn(async () => {});

describe("stale filings are downgraded by the L4 policy (L6 T3)", () => {
  const nbi = { value: 415.1, unit: "USD M", period: "Year to 2026-09-30" };

  it("verifies a filing figure while its statement is fresh", () => {
    const a = filingAssessment("3126", "net_banking_income", nbi, "2026-09-30", "u", "2026-11-10");
    expect(assignEvidenceState(a).state).toBe("VERIFIED");
  });

  it("downgrades it once the statement is older than a quarter and its grace", () => {
    const a = filingAssessment("3126", "net_banking_income", nbi, "2026-09-30", "u", "2027-01-10");
    expect(assignEvidenceState(a)).toEqual({
      state: "PARTIALLY_VERIFIED",
      reasons: ["Its authoritative sources are stale."],
    });
  });
});

describe("each source records its last success (L6 T3)", () => {
  it("records a run of each source the connector reads, success or failure", async () => {
    const record = vi.fn(async (_r: SourceRun) => {});
    const at = () => new Date("2026-11-10T09:00:00Z");
    await readLatestUsd("3126", { fetch: recorded, sleep, record, now: at });
    expect(record.mock.calls.map(([r]) => [r.source, r.ok])).toEqual([
      ["tn-filings", true],
      ["bct-usd", true],
    ]);
    record.mockClear();
    await readLatestUsd("3126", {
      fetch: vi.fn(async () => new Response("", { status: 404 })),
      sleep,
      record,
      now: at,
    });
    expect(record.mock.calls[0]![0]).toMatchObject({
      source: "tn-filings",
      ok: false,
      at: "2026-11-10T09:00:00.000Z",
      detail: expect.stringMatching(/404/),
    });
  });

  it("keeps each source's last success and any later failure", async () => {
    const rows = [
      { source: "tn-filings", at: "2026-11-10T09:00:00Z", ok: false, detail: "answered 503" },
      { source: "tn-filings", at: "2026-11-09T09:00:00Z", ok: true, detail: "" },
      { source: "tn-filings", at: "2026-11-01T09:00:00Z", ok: true, detail: "" },
    ];
    const limit = vi.fn(async () => ({ data: rows, error: null }));
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: null })),
        select: () => ({ order: () => ({ limit }) }),
      })),
    };
    expect(await supabaseRuns(client).latest()).toEqual({
      "tn-filings": {
        lastSuccess: "2026-11-09T09:00:00Z",
        lastFailure: { at: "2026-11-10T09:00:00Z", detail: "answered 503" },
      },
    });
  });

  it("calls a source stale once its last success is older than its window, and says when none is known", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    const h = healthOf({ "tn-filings": { lastSuccess: "2026-07-01T00:00:00Z" } }, now);
    expect(h.find((s) => s.id === "tn-filings")).toMatchObject({ status: "stale" });
    expect(h.find((s) => s.id === "bct-usd")).toMatchObject({ status: "never read" });
    expect(SOURCES.map((s) => s.id)).toEqual(["tn-filings", "bct-usd"]);
  });

  it("serves the health of every source, or says it is not tracked", async () => {
    const now = () => new Date("2026-11-10T00:00:00Z");
    const none = await handleSources(new Request("http://x/api/sources"), { store: null, now });
    expect(await none.json()).toMatchObject({ untracked: expect.stringMatching(/not tracked/) });
    const store = { record: vi.fn(), latest: vi.fn(async () => ({})) };
    const res = await handleSources(new Request("http://x/api/sources"), { store, now });
    expect((await res.json()).sources).toHaveLength(2);
  });
});

describe("the shell's source-health entry (L6 T3)", () => {
  it("is in the shell's navigation", () => {
    const paths = NAV_GROUPS.flatMap((g): { to: string }[] => [...g.items]).map((i) => i.to);
    expect(paths).toContain("/sources");
  });

  it("shows each source's last success and whether it is fresh", async () => {
    const body = {
      sources: [
        {
          id: "tn-filings",
          name: "Bourse de Tunis",
          status: "fresh",
          lastSuccess: "2026-11-09T09:00:00Z",
        },
        { id: "bct-usd", name: "BCT rate", status: "never read", lastSuccess: null },
      ],
    };
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    await open("/sources");
    expect(await screen.findByText("Bourse de Tunis")).toBeInTheDocument();
    expect(screen.getByText(/2026-11-09/)).toBeInTheDocument();
    expect(screen.getByText("never read")).toBeInTheDocument();
    spy.mockRestore();
  }, 30_000);
});
