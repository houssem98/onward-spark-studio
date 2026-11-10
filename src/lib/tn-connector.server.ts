import { extractText, getDocumentProxy } from "unpdf";

import { fetchRetry, type Failure, type FetchOptions } from "@/lib/connector";
import { listingUrl, parseIndicators, parseListing } from "@/lib/tn-filings";

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
