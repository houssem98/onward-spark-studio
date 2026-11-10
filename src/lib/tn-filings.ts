import { DEFINITIONS } from "@/lib/definitions";

// The quarterly activity indicators Tunisian listed banks publish on the exchange's site, read as
// public documents (L6 T1). Pure: the connector fetches, these read what it fetched.

const ORIGIN = "https://tunis-stockexchange.com";
const QUARTERLY_INDICATORS = "1519";

export const listingUrl = (company: string) =>
  `${ORIGIN}/publications-societes?type_societe=${company}&categorie=${QUARTERLY_INDICATORS}`;

/** Each listed quarter, newest first: its period end and its statement's PDF. */
export function parseListing(html: string) {
  const out = html
    .split(/(?=<a href="[^"]*" class="card-link)/)
    .slice(1)
    .flatMap((card) => {
      const d = /^<a href="[^"]*-(\d{2})(\d{2})(\d{4})"/.exec(card);
      const pdf = /class="download-link[^"]*" href="([^"]+\.pdf)"/.exec(card);
      return d && pdf
        ? [{ period: `${d[3]}-${d[2]}-${d[1]}`, pdf: new URL(pdf[1]!, ORIGIN).href }]
        : [];
    });
  if (!out.length) throw new Error("The listing holds no quarterly indicators.");
  return out;
}

export type Indicator = "net_banking_income" | "net_loans" | "customer_deposits" | "bank_equity";

// The numbered rows of the standard statement. Each row's figures run: this quarter, the same
// quarter last year, year to date, the same last year, last year end; a balance has no quarter
// figures. So the current period end is always the third figure from the end.
const ROWS: Record<Indicator, string> = {
  net_banking_income: "Produit net bancaire",
  net_loans: "Encours des crédits nets",
  customer_deposits: "Encours des dépôts",
  bank_equity: "Capitaux propres",
};
const FIGURE = /\d{1,3}(?: \d{3})*,\d+/g;

/** The statement's figures for its period end, in dinars as filed. */
export function parseIndicators(raw: string) {
  const text = raw.replace(/\s+/g, " ");
  const tnd = {} as Record<Indicator, number>;
  for (const [id, label] of Object.entries(ROWS) as [Indicator, string][]) {
    const at = text.indexOf(label);
    const row = at < 0 ? "" : text.slice(at + label.length).split(/·|\b\d{1,2}- |FAITS/)[0]!;
    const figures = row.match(FIGURE) ?? [];
    if (figures.length < 3)
      throw new Error(`The statement's "${label}" row is missing or unreadable.`);
    tnd[id] = Number(figures[figures.length - 3]!.replace(/ /g, "").replace(",", "."));
  }
  const end = /AU (\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  if (!end) throw new Error("The statement names no period end.");
  return { periodEnd: `${end[3]}-${end[2]}-${end[1]}`, tnd };
}

export interface Fx {
  /** Dinars per US dollar. */
  tndPerUsd: number;
  date: string;
  source: string;
}

/** How far before a period end a rate may be dated, when the BCT published none on the day. */
export const FX_WINDOW_DAYS = 10;

/** Each figure in the registry's unit, with its period and the rate that converted it. */
export function normalize(ind: ReturnType<typeof parseIndicators>, fx: Fx) {
  const age = (Date.parse(ind.periodEnd) - Date.parse(fx.date)) / 864e5;
  if (!(age >= 0 && age <= FX_WINDOW_DAYS))
    throw new Error(`The rate is dated ${fx.date}; the statement's period ends ${ind.periodEnd}.`);
  return Object.fromEntries(
    (Object.entries(ind.tnd) as [Indicator, number][]).map(([id, v]) => [
      id,
      {
        value: v / 1e6 / fx.tndPerUsd,
        unit: DEFINITIONS[id].unit,
        period: id === "net_banking_income" ? `Year to ${ind.periodEnd}` : `At ${ind.periodEnd}`,
        fx,
      },
    ]),
  ) as Record<Indicator, { value: number; unit: string; period: string; fx: Fx }>;
}
