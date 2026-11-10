import { fetchRetry, type Failure, type FetchOptions } from "@/lib/connector";
import { FX_WINDOW_DAYS, type Fx } from "@/lib/tn-filings";

// The Banque Centrale de Tunisie's published dinars per US dollar (L6 T1: figures are converted at
// the BCT's rate on each filing's period end). When the BCT published none that day, the human's
// rule is the last rate it published before it. The series is the BCT's table of daily interbank
// rates, PL203130; the source line names it and the day it is from, so no one takes it for another.

export const BCT_RATES = "https://www.bct.gov.tn/bct/siteprod/stat_mens.jsp";
const SERIES = "PL203130";
const DOLLAR = "V203130001";

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");
const daysBefore = (iso: string, n: number) =>
  new Date(Date.parse(iso) - n * 864e5).toISOString().slice(0, 10);

/** The BCT's Dollar US rates for the days that end on `date`. */
export const bctRequest = (date: string) => ({
  url: BCT_RATES,
  init: {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      pilote: SERIES,
      cat: `'0','${DOLLAR}'`,
      db: daysBefore(date, FX_WINDOW_DAYS).replaceAll("-", ""),
      df: date.replaceAll("-", ""),
      la: "",
    }).toString(),
  },
});

const cells = (html: string) =>
  [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
    c[1]!
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

/** The last rate the page shows on or before `date`; null when it shows none. */
export function parseRate(html: string, date: string): Fx | null {
  const c = cells(html);
  const row = c.indexOf("Dollar US");
  if (row < 0) throw new Error("The BCT page holds no Dollar US row.");
  // The page lists the days it published, then the Dollar US rate of each, in the same order.
  const days = c.slice(0, row).filter((x) => /^\d{2}\/\d{2}\/\d{4}$/.test(x));
  const rates = c.slice(row + 1).filter((x) => /^\d+,\d+$/.test(x));
  if (days.length !== rates.length) throw new Error("The BCT page's days and rates do not pair.");
  const iso = days.map((d) => d.split("/").reverse().join("-"));
  let i = iso.length - 1;
  while (i >= 0 && iso[i]! > date) i--;
  if (i < 0) return null;
  const day = days[i]!;
  return {
    tndPerUsd: Number(rates[i]!.replace(",", ".")),
    date: iso[i]!,
    source: `BCT, daily interbank rate, Dollar US (${SERIES}), ${day}${iso[i] === date ? "" : `, the last published on or before ${ddmmyyyy(date)}`}`,
  };
}

export async function readBctRate(
  date: string,
  opts: FetchOptions = {},
): Promise<{ state: "ok"; data: Fx } | Failure> {
  const { url, init } = bctRequest(date);
  const res = await fetchRetry(url, opts, init);
  if (res.state !== "ok") return res;
  try {
    const fx = parseRate(await res.res.text(), date);
    return fx
      ? { state: "ok", data: fx }
      : {
          state: "unpublished",
          detail: `The BCT published no Dollar US rate in the ${FX_WINDOW_DAYS} days to ${date}.`,
        };
  } catch (e) {
    return { state: "malformed", detail: e instanceof Error ? e.message : String(e) };
  }
}
