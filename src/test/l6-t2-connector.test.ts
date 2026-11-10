import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { fetchRetry } from "@/lib/connector";
import { DEFINITIONS } from "@/lib/definitions";
import { listingUrl, normalize, parseIndicators, parseListing } from "@/lib/tn-filings";
import { pdfText, readLatest } from "@/lib/tn-connector.server";

// Recorded on 2026-11-10 from tunis-stockexchange.com; tests never call the live site.
const LISTING = readFileSync("src/test/recorded/tn/biat-listing.html", "utf8");
const PDF = new Uint8Array(readFileSync("src/test/recorded/tn/biat-q3-2026.pdf"));
const FX = { tndPerUsd: 2.95238, date: "2026-09-30", source: "BCT reference rate (recorded)" };

const ok = (body: BodyInit, type = "text/html") =>
  new Response(body, { status: 200, headers: { "content-type": type } });

describe("Tunisian bank filings: the recorded listing and statement (L6 T2)", () => {
  it("lists each quarter's period end and PDF from the exchange's listing", () => {
    expect(listingUrl("3126")).toBe(
      "https://tunis-stockexchange.com/publications-societes?type_societe=3126&categorie=1519",
    );
    const list = parseListing(LISTING);
    expect(list[0]).toEqual({
      period: "2026-09-30",
      pdf: "https://tunis-stockexchange.com/sites/default/files/2026-10/ind_3eme_trim_2026_biat.pdf",
    });
    expect(list.map((x) => x.period)).toContain("2025-09-30");
  });

  it("reads the year-to-date figures, in dinars, from the statement", async () => {
    const r = parseIndicators(await pdfText(PDF));
    expect(r).toEqual({
      periodEnd: "2026-09-30",
      tnd: {
        net_banking_income: 1_236_054_972.0,
        net_loans: 13_324_356_427.0,
        customer_deposits: 23_517_607_180.0,
        bank_equity: 2_123_642_172.5,
      },
    });
  });

  it("normalizes to the registry's unit, USD M, at a named and dated rate", () => {
    const n = normalize(
      {
        periodEnd: "2026-09-30",
        tnd: {
          net_banking_income: 1_236_054_972,
          net_loans: 0,
          customer_deposits: 0,
          bank_equity: 0,
        },
      },
      FX,
    );
    expect(DEFINITIONS.net_banking_income.unit).toBe("USD M");
    expect(n.net_banking_income).toEqual({
      value: 1_236.054972 / 2.95238,
      unit: "USD M",
      period: "Year to 2026-09-30",
      fx: FX,
    });
  });

  it("refuses a statement or a listing it cannot read, saying why", () => {
    expect(() => parseIndicators("INDICATEURS D'ACTIVITE\n3- Produit net bancaire\n")).toThrow(
      /Produit net bancaire/,
    );
    expect(() => parseListing("<html><body>nothing here</body></html>")).toThrow(/no quarterly/);
  });
});

describe("the connector's fetch: timeout, retry and explicit failure (L6 T2)", () => {
  const sleep = vi.fn(async () => {});

  it("retries a server error with backoff, then succeeds", async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(ok("fine"));
    const r = await fetchRetry("https://x/", { fetch: f, sleep, retries: 2, backoffMs: 500 });
    expect(r).toMatchObject({ state: "ok" });
    expect(f).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it("does not retry a client error, and says so", async () => {
    const f = vi.fn<typeof fetch>(async () => new Response("", { status: 404 }));
    const r = await fetchRetry("https://x/", { fetch: f, sleep, retries: 2 });
    expect(r).toEqual({ state: "http_error", detail: "https://x/ answered 404" });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("times out a call that never answers, retries it, and gives up explicitly", async () => {
    const f = vi.fn<typeof fetch>(
      (_u, init) =>
        new Promise((_res, rej) =>
          init!.signal!.addEventListener("abort", () => rej(new DOMException("t", "AbortError"))),
        ),
    );
    const r = await fetchRetry("https://x/", { fetch: f, sleep, retries: 1, timeoutMs: 20 });
    expect(r).toEqual({ state: "timeout", detail: "https://x/ did not answer within 20 ms" });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("reads the latest quarter end to end from recorded responses", async () => {
    const f = vi.fn<typeof fetch>(async (u) =>
      String(u).endsWith(".pdf") ? ok(PDF, "application/pdf") : ok(LISTING),
    );
    const r = await readLatest("3126", { fetch: f, sleep });
    expect(r).toMatchObject({ state: "ok", data: { periodEnd: "2026-09-30" } });
    const bad = await readLatest("3126", {
      fetch: vi.fn<typeof fetch>(async () => ok("<html></html>")),
      sleep,
    });
    expect(bad).toMatchObject({
      state: "malformed",
      detail: expect.stringMatching(/no quarterly/),
    });
  });
});
