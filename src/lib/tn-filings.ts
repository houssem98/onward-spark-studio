import { DEFINITIONS } from "@/lib/definitions";
import { FRESH_FOR_DAYS } from "@/lib/evidence";
import type { Assessment } from "@/lib/evidence-policy";

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

/** A run of text where the PDF draws it: x and y of its baseline start, its width, its page. */
export interface TextItem {
  s: string;
  x: number;
  y: number;
  w: number;
  page: number;
}
type Cell = { s: string; x0: number; x1: number };

// Items on one baseline (within 2 pt) form a line; items under 4 pt apart form one cell, since a
// figure is sometimes drawn in pieces ("288 53" then "2"). A column's gap is never under 8 pt.
function lines(items: TextItem[]) {
  const out: TextItem[][] = [];
  for (const it of items.filter((i) => i.s.trim()).sort((a, b) => a.page - b.page || b.y - a.y)) {
    const l = out.at(-1);
    if (l && l[0]!.page === it.page && l[0]!.y - it.y <= 2) l.push(it);
    else out.push([it]);
  }
  return out.map((l) =>
    l
      .sort((a, b) => a.x - b.x)
      .reduce<Cell[]>((cells, it) => {
        const c = cells.at(-1);
        const gap = c ? it.x - c.x1 : Infinity;
        if (c && gap < 4) {
          c.s += (gap > 1 ? " " : "") + it.s.trim();
          c.x1 = Math.max(c.x1, it.x + it.w);
        } else cells.push({ s: it.s.trim(), x0: it.x, x1: it.x + it.w });
        return cells;
      }, []),
  );
}

const FIGURE = /^\d{1,3}(?: ?\d{3})*(?:,\d+)?$/;
const flat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\p{M}\s]/gu, "")
    .toLowerCase();

// The rows every statement has, matched with accents and spaces removed (STB's PDF splits words:
// "Pr oduit net bancair e"). Labels differ by bank: Amen files "créances", Wifack "financements".
const ROWS: Record<Indicator, [string, RegExp]> = {
  net_banking_income: ["Produit net bancaire", /produitnet/],
  net_loans: ["Encours des crédits", /encours(nets?)?(des|de)(credits|creances|financements)/],
  customer_deposits: ["Encours des dépôts", /encours(des|de)depots?/],
  bank_equity: ["Capitaux propres", /capitauxpropres/],
};

// Case matters for "mD" (thousands, BH) against "MD" (millions, in notes).
const UNITS: [RegExp, number][] = [
  [/milliers? de dinars/i, 1000],
  [/\b1000 DT\b|\bKTND\b|\bmD\b/, 1000],
  [/\ben dinars\b/i, 1],
];

// BNA's and UIB's tables state no unit; their notes restate a table figure in millions
// ("6 517,3 MTND" for 6 517 326), which fixes the unit, read from the statement itself.
function unitFromNotes(text: string, filed: number[]) {
  const millions = [
    ...text.matchAll(/(\d[\d .]*)(?:,(\d+))?\s*(?:MTND|millions? de dinars)/gi),
  ].map(([, int, dec = ""]) => ({
    v: Number(`${int!.replace(/[ .]/g, "")}.${dec}`),
    d: dec.length,
  }));
  return [1000, 1].find((u) =>
    filed.some((f) => millions.some((m) => Math.abs(m.v - (f * u) / 1e6) <= 0.5 * 10 ** -m.d)),
  );
}

const MONTHS: Record<string, string> = { mars: "03", juin: "06", septembre: "09", decembre: "12" };

/** The latest quarter end the statement names, as 30/09/2026, 30/09/26 or 30 septembre 2026. */
function periodEnd(text: string) {
  const t = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return [
    ...[...t.matchAll(/\b(\d{2})[/.-](\d{2})[/.-](\d{4}|\d{2})\b/g)].map(
      ([, d, m, y]) => `${y!.length === 2 ? `20${y}` : y}-${m}-${d}`,
    ),
    ...[...t.matchAll(/\b(\d{2}) (mars|juin|septembre|decembre) (\d{4})\b/g)].map(
      ([, d, m, y]) => `${y}-${MONTHS[m!]}-${d}`,
    ),
  ]
    .filter((d) => /-(03-31|06-30|09-30|12-31)$/.test(d))
    .sort()
    .at(-1);
}

/**
 * The statement's figures for its period end, in dinars. Each figure is taken by its column: net
 * banking income's row runs this quarter, the same quarter last year, then the year to date, so its
 * third figure marks the period-end column, and each balance is the figure drawn in that column.
 */
export function parseIndicators(items: TextItem[]) {
  const ls = lines(items);
  let label = "";
  const table = ls.flatMap((cells, i) => {
    const figures = cells.filter((c) => FIGURE.test(c.s));
    label += cells
      .filter((c) => !FIGURE.test(c.s))
      .map((c) => c.s)
      .join("");
    if (!figures.length) return [];
    const row = { i, label: flat(label), figures };
    label = "";
    return [row];
  });
  const row = (id: Indicator) => {
    const [name, match] = ROWS[id];
    const r = table.find((t) => match.test(t.label));
    if (!r) throw new Error(`The statement's "${name}" row is missing or unreadable.`);
    return r;
  };
  const nbi = row("net_banking_income");
  const col = nbi.figures[2];
  if (!col) throw new Error(`The statement's "Produit net bancaire" row is missing or unreadable.`);
  const filed = {} as Record<Indicator, number>;
  for (const id of Object.keys(ROWS) as Indicator[]) {
    const f = row(id).figures.find((c) => c.x0 < col.x1 && c.x1 > col.x0);
    if (!f)
      throw new Error(
        `The statement's "${ROWS[id][0]}" row has no figure in its period-end column.`,
      );
    filed[id] = Number(f.s.replace(/ /g, "").replace(",", "."));
  }
  const text = (from: number, to?: number) =>
    ls
      .slice(from, to)
      .map((l) => l.map((c) => c.s).join(" "))
      .join("\n");
  const unit =
    UNITS.find(([re]) => re.test(text(0, nbi.i)))?.[1] ??
    unitFromNotes(text(0), Object.values(filed));
  if (!unit) throw new Error("The statement names no unit, in its table or its notes.");
  const end = periodEnd(text(0));
  if (!end) throw new Error("The statement names no period end.");
  const tnd = Object.fromEntries(Object.entries(filed).map(([id, v]) => [id, v * unit])) as Record<
    Indicator,
    number
  >;
  return { periodEnd: end, tnd };
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

// The banks listed on the exchange and their ids in its publications filter, read from its
// company publications page on 2026-11-10 (unlisted "Hors Cote" banks left out, L6 T1).
export const LISTED_BANKS: Record<string, string> = {
  "3114": "Amen Bank",
  "3118": "ATB",
  "3120": "Attijari Bank",
  "3124": "BH Bank",
  "3126": "BIAT",
  "3127": "BNA",
  "3130": "BTE",
  "3136": "STB",
  "3140": "UBCI",
  "3141": "UIB",
  "3142": "Wifack International Bank",
};

/**
 * A filed figure as the policy assesses it: the bank's own statement, a filing the CMF requires
 * of every listed bank, is its authoritative source, fresh for a quarter and its grace.
 */
export function filingAssessment(
  company: string,
  id: Indicator,
  figure: { value: number; unit: string; period: string },
  periodEnd: string,
  url: string,
  today: string,
): Assessment {
  const bank = LISTED_BANKS[company] ?? company;
  const source = {
    id: `TN-${company}-${periodEnd}`,
    name: `${bank} quarterly indicators to ${periodEnd}`,
    authority: "regulatory" as const,
    entity: bank,
    period: figure.period,
    asOf: periodEnd,
    freshForDays: FRESH_FOR_DAYS["Quarterly"]!,
    unit: figure.unit,
    licence: "Public filing, used for testing and education (L6 T1)",
    version: url,
  };
  return {
    claim: {
      id: `${company}-${id}`,
      text: `${bank} ${DEFINITIONS[id].label}`,
      kind: "measured",
      metricId: id,
    },
    claimed: figure.value,
    scope: { entity: bank, period: figure.period },
    sources: [source],
    values: [{ sourceId: source.id, value: figure.value }],
    today,
  };
}
