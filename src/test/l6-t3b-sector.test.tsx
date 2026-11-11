import { readFileSync } from "node:fs";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NAV_GROUPS } from "@/components/AppShell";
import { readSector } from "@/lib/tn-connector.server";
import { LISTED_BANKS } from "@/lib/tn-filings";
import { open, setUp } from "./a11y";

setUp();

// Recorded on 2026-11-10: BIAT's listing and statement and the BCT's rate; every other bank's
// listing answers 404 here. Tests never call the live sites.
const rec = (f: string) => readFileSync(`src/test/recorded/tn/${f}`);
const ok = (body: BodyInit) => new Response(body, { status: 200 });
const recorded = vi.fn<typeof fetch>(async (u) => {
  const url = String(u);
  if (url.includes("bct.gov.tn")) return ok(rec("bct-usd-2026-09-30.html"));
  if (url.endsWith(".pdf")) return ok(rec("biat-q3-2026.pdf"));
  if (url.includes("type_societe=3126")) return ok(rec("biat-listing.html"));
  return new Response("", { status: 404 });
});
const read = () =>
  readSector({
    fetch: recorded,
    sleep: async () => {},
    now: () => new Date("2026-11-10T09:00:00Z"),
  });

describe("the Tunisian banks' latest quarter (L6 T3b)", () => {
  it("reads every listed bank, with each figure in USD M, its rate and the policy's state", async () => {
    const banks = await read();
    expect(banks.map((b) => b.bank)).toEqual(Object.values(LISTED_BANKS));
    const biat = banks.find((b) => b.bank === "BIAT")!;
    if (biat.state !== "ok") throw new Error(biat.detail);
    expect(biat.periodEnd).toBe("2026-09-30");
    expect(biat.source).toMatch(/\.pdf$/);
    expect(biat.figures.net_banking_income.value.toFixed(1)).toBe("415.1");
    expect(biat.figures.net_banking_income.fx).toMatchObject({
      tndPerUsd: 2.97745,
      date: "2026-09-30",
    });
    expect(biat.figures.net_banking_income.state).toBe("VERIFIED");
    expect(Object.keys(biat.figures).sort()).toEqual([
      "bank_equity",
      "customer_deposits",
      "net_banking_income",
      "net_loans",
    ]);
  });

  it("says how a bank's read failed", async () => {
    const bh = (await read()).find((b) => b.bank === "BH Bank")!;
    expect(bh).toMatchObject({ state: "http_error", detail: expect.stringMatching(/404/) });
  });
});

describe("the Tunisian banks page (L6 T3b)", () => {
  it("is in the shell's navigation", () => {
    const paths = NAV_GROUPS.flatMap((g): { to: string }[] => [...g.items]).map((i) => i.to);
    expect(paths).toContain("/tn-banks");
  });

  it("reads nothing until asked, then shows each bank's figures, rate, filing and state", async () => {
    const body = JSON.stringify({ banks: await read() });
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(body, { status: 200 }));
    await open("/tn-banks");
    const button = await screen.findByRole("button", { name: "Read the latest filings" });
    expect(spy.mock.calls.filter(([u]) => String(u).includes("/api/tn-banks"))).toHaveLength(0);
    fireEvent.click(button);
    expect(await screen.findByText("BIAT")).toBeInTheDocument();
    expect(spy.mock.calls.filter(([u]) => String(u).includes("/api/tn-banks"))).toHaveLength(1);
    expect(screen.getAllByText(/415\.1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.97745/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Verified/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /BIAT.*filing/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/\.pdf$/),
    );
    expect(screen.getByText(/BH Bank/).closest("li")).toHaveTextContent(/404/);
    spy.mockRestore();
  }, 30_000);
});
