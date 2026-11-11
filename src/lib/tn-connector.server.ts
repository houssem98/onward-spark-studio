import { extractText, getDocumentProxy } from "unpdf";

import { readBctRate } from "@/lib/bct-rate";
import { fetchRetry, type Failure, type FetchOptions } from "@/lib/connector";
import { assignEvidenceState, type Decision } from "@/lib/evidence-policy";
import type { SourceRun } from "@/lib/source-runs.server";
import {
  LISTED_BANKS,
  filingAssessment,
  listingUrl,
  normalize,
  parseIndicators,
  parseListing,
  type Indicator,
} from "@/lib/tn-filings";

// Server only: reads a bank's latest quarterly statement from the exchange's public site.

export async function pdfText(bytes: Uint8Array) {
  // PDF.js takes over the buffer it is given and leaves the caller's empty, so it gets a copy.
  const { text } = await extractText(await getDocumentProxy(bytes.slice()), { mergePages: true });
  return text;
}

const malformed = (e: unknown): Failure => ({
  state: "malformed",
  detail: e instanceof Error ? e.message : String(e),
});

export async function readLatest(company: string, opts: FetchOptions = {}) {
  const list = await fetchRetry(listingUrl(company), opts);
  if (list.state !== "ok") return list;
  let latest;
  try {
    latest = parseListing(await list.res.text())[0]!;
  } catch (e) {
    return malformed(e);
  }
  const doc = await fetchRetry(latest.pdf, opts);
  if (doc.state !== "ok") return doc;
  try {
    const data = parseIndicators(await pdfText(new Uint8Array(await doc.res.arrayBuffer())));
    return { state: "ok" as const, data: { ...data, source: latest.pdf } };
  } catch (e) {
    return malformed(e);
  }
}

type Tracking = { record?: (run: SourceRun) => Promise<void>; now?: () => Date };

/** The latest quarter in the registry's USD M, at the BCT's rate for its period end; each source's
 * read is recorded, success or failure, so the shell can show its last success (L6 T3). */
export async function readLatestUsd(company: string, opts: FetchOptions & Tracking = {}) {
  const { record, now = () => new Date(), ...fetchOpts } = opts;
  const track = async (source: string, r: { state: "ok"; data: { source?: string } } | Failure) =>
    record?.({
      source,
      at: now().toISOString(),
      ok: r.state === "ok",
      detail: r.state === "ok" ? (r.data.source ?? "") : r.detail,
    });
  const q = await readLatest(company, fetchOpts);
  await track("tn-filings", q);
  if (q.state !== "ok") return q;
  const fx = await readBctRate(q.data.periodEnd, fetchOpts);
  await track("bct-usd", fx);
  if (fx.state !== "ok") return fx;
  return {
    state: "ok" as const,
    data: normalize(q.data, fx.data),
    source: q.data.source,
    periodEnd: q.data.periodEnd,
  };
}

/** Every listed bank's latest quarter, each figure with the state the L4 policy sets (L6 T3b). */
export async function readSector(opts: FetchOptions & Tracking = {}) {
  const today = (opts.now?.() ?? new Date()).toISOString().slice(0, 10);
  return Promise.all(
    Object.entries(LISTED_BANKS).map(async ([company, bank]) => {
      const r = await readLatestUsd(company, opts);
      if (r.state !== "ok") return { company, bank, state: r.state, detail: r.detail };
      const figures = Object.fromEntries(
        (Object.entries(r.data) as [Indicator, (typeof r.data)[Indicator]][]).map(([id, f]) => {
          const a = filingAssessment(company, id, f, r.periodEnd, r.source, today);
          return [id, { ...f, ...assignEvidenceState(a) }];
        }),
      ) as Record<Indicator, (typeof r.data)[Indicator] & Decision>;
      return { company, bank, state: r.state, periodEnd: r.periodEnd, source: r.source, figures };
    }),
  );
}
