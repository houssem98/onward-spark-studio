import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { BCT_RATES, bctRequest, parseRate, readBctRate } from "@/lib/bct-rate";
import { readLatestUsd } from "@/lib/tn-connector.server";
import { normalize } from "@/lib/tn-filings";

// Recorded on 2026-11-10 from bct.gov.tn and tunis-stockexchange.com; tests never call either.
const rec = (f: string) => readFileSync(`src/test/recorded/tn/${f}`);
const RATE_0930 = rec("bct-usd-2026-09-30.html").toString("utf8");
const NONE_0927 = rec("bct-usd-2026-09-27.html").toString("utf8");
const RANGE_TO_0927 = rec("bct-usd-2026-09-17-to-27.html").toString("utf8");
const html = (body: BodyInit) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html" } });
const sleep = vi.fn(async () => {});

describe("the BCT rate (L6 T2b)", () => {
  it("asks the BCT for the Dollar US rates of the ten days up to the period end", () => {
    const { url, init } = bctRequest("2026-09-30");
    expect(url).toBe(BCT_RATES);
    expect(init.method).toBe("POST");
    expect(Object.fromEntries(new URLSearchParams(init.body as string))).toEqual({
      pilote: "PL203130",
      cat: "'0','V203130001'",
      db: "20260920",
      df: "20260930",
      la: "",
    });
  });

  it("takes the last rate published on or before an unpublished period end, and says so (the human's rule)", () => {
    expect(parseRate(RANGE_TO_0927, "2026-09-27")).toEqual({
      tndPerUsd: 2.96138,
      date: "2026-09-25",
      source:
        "BCT, daily interbank rate, Dollar US (PL203130), 25/09/2026, the last published on or before 27/09/2026",
    });
  });

  it("converts only at a rate dated on, or in the ten days before, the period end", () => {
    const q = {
      periodEnd: "2026-09-27",
      tnd: { net_banking_income: 1e6, net_loans: 0, customer_deposits: 0, bank_equity: 0 },
    };
    const fx = (date: string) => ({ tndPerUsd: 3, date, source: "s" });
    expect(normalize(q, fx("2026-09-25")).net_banking_income.value).toBeCloseTo(1 / 3, 12);
    expect(() => normalize(q, fx("2026-09-28"))).toThrow(/dated 2026-09-28/);
    expect(() => normalize(q, fx("2026-09-10"))).toThrow(/dated 2026-09-10/);
  });

  it("reads the dinars per dollar the BCT published for that day, naming the series", () => {
    expect(parseRate(RATE_0930, "2026-09-30")).toEqual({
      tndPerUsd: 2.97745,
      date: "2026-09-30",
      source: "BCT, daily interbank rate, Dollar US (PL203130), 30/09/2026",
    });
  });

  it("says when the BCT published no rate that day, and when its page cannot be read", async () => {
    const none = await readBctRate("2026-09-27", {
      fetch: vi.fn(async () => html(NONE_0927)),
      sleep,
    });
    expect(none).toEqual({
      state: "unpublished",
      detail: "The BCT published no Dollar US rate in the 10 days to 2026-09-27.",
    });
    const bad = await readBctRate("2026-09-30", {
      fetch: vi.fn(async () => html("<html>oops</html>")),
      sleep,
    });
    expect(bad).toMatchObject({ state: "malformed", detail: expect.stringMatching(/Dollar US/) });
  });

  it("converts a bank's latest quarter at the BCT's rate for its period end, end to end", async () => {
    const f = vi.fn<typeof fetch>(async (u) => {
      const url = String(u);
      if (url === BCT_RATES) return html(RATE_0930);
      if (url.endsWith(".pdf")) return new Response(rec("biat-q3-2026.pdf"), { status: 200 });
      return html(rec("biat-listing.html"));
    });
    const r = await readLatestUsd("3126", { fetch: f, sleep });
    expect(r.state).toBe("ok");
    if (r.state !== "ok") return;
    expect(r.data.net_banking_income).toMatchObject({
      value: 1_236.054972 / 2.97745,
      unit: "USD M",
      period: "Year to 2026-09-30",
      fx: { tndPerUsd: 2.97745, date: "2026-09-30" },
    });
  });
});
