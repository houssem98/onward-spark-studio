import type { Peer } from "@/data/finance";
import type { DefinitionId } from "@/lib/definitions";
import type { FinanceData } from "@/repo/types";

// What a question is about, resolved before anything is computed: the flagship question,
// a department's revenue against its peers. Pure, so the same question always gives the same scope.
export interface Scope {
  entity: string;
  department: string;
  period: string;
  currency: string;
  /** The peers the benchmark is computed over. */
  cohort: string[];
  definitions: DefinitionId[];
}

export type ScopeField = "department" | "period";
export type Chosen = Partial<Record<ScopeField, string>>;

export interface Ask {
  field: ScopeField;
  question: string;
  choices: { value: string; label: string }[];
  note: string;
}

export type Resolution =
  | { kind: "resolved"; scope: Scope; left: { id: string; reason: string }[] }
  | { kind: "ambiguous"; asks: Ask[] }
  | { kind: "unsupported"; reason: string };

export interface Catalog {
  entity: string;
  currency: string;
  /** Latest first. */
  periods: string[];
  departments: { id: string; name: string; costCenter?: boolean }[];
  peers: Peer[];
}

export const catalogOf = (
  f: Pick<FinanceData, "bank" | "departments" | "peers" | "scorecard">,
  entity: string,
): Catalog => ({
  entity,
  currency: f.bank.currency,
  // The demo's scorecard also carries its synthetic flag; only the fiscal years are periods.
  periods: Object.keys(f.scorecard)
    .filter((k) => /^FY\d{4}$/.test(k))
    .sort()
    .reverse(),
  departments: f.departments,
  peers: f.peers,
});

// Peers report one revenue figure, credit revenue, so credit is the one department they compare on.
const PEER_DEPARTMENTS = ["credit"];
const PEER_DEFINITIONS: DefinitionId[] = [
  "credit_revenue",
  "credit_revenue_growth",
  "peer_benchmark",
  "revenue_gap",
];
const OTHER_METRIC =
  /\bmargin|\bnim\b|cost[- ]to[- ]income|\bcir\b|\broe\b|\broa\b|return on|deposit|\bassets?\b/;
const CURRENCIES: [string, RegExp][] = [
  ["USD", /\busd\b|dollar|\$/],
  ["EUR", /\beur\b|euro|€/],
  ["GBP", /\bgbp\b|sterling|pound|£/],
  ["JPY", /\bjpy\b|\byen\b|¥/],
  ["CHF", /\bchf\b|swiss franc/],
];

const mentions = (t: string, name: string) =>
  new RegExp(`\\b${name.split(" ")[0]!.toLowerCase()}\\b`).test(t);
const list = (xs: string[]) => xs.join(", ");

/** Why a peer cannot stand in a credit revenue comparison for the period; null when it can. */
export function peerGap(p: Peer, period: string): string | null {
  if (p.source === "NOT_AVAILABLE") return `${p.name} has no permitted source`;
  if (p.creditRevenue === null)
    return p.notDisclosed
      ? `${p.name} discloses ${p.notDisclosed.instead} only, and ${p.notDisclosed.why}`
      : `${p.name} does not report credit revenue`;
  if (p.period !== period) return `${p.name} reports ${p.period}, not ${period}`;
  return null;
}

function periodsNamed(t: string, periods: string[]) {
  const named = [...t.matchAll(/\b(?:fy\s?)?(20\d\d)\b/g)].map((m) => `FY${m[1]}`);
  if (/\b(this|current) (fiscal )?year\b|\blatest\b/.test(t)) named.push(periods[0]!);
  if (/\b(last|prior|previous) (fiscal )?year\b/.test(t))
    named.push(periods[1] ?? `the year before ${periods[0]}`);
  return [...new Set(named)];
}

export function resolveScope(q: string, cat: Catalog, chosen: Chosen = {}): Resolution {
  const t = q.toLowerCase();
  const no = (reason: string): Resolution => ({ kind: "unsupported", reason });
  if (!/\bpeers?\b|competitor|rival/.test(t) && !cat.peers.some((p) => mentions(t, p.name)))
    return no(
      "This question compares nothing with peers; scope resolution covers revenue against peers only.",
    );
  if (OTHER_METRIC.test(t))
    return no(
      "Peers are compared here on credit revenue only; their margin, cost and return ratios are on the Peer benchmarking tab of the performance page.",
    );
  const ccy = CURRENCIES.filter(([c, re]) => c !== cat.currency && re.test(t))[0]?.[0];
  if (ccy) return no(`Figures are held in ${cat.currency}; no conversion to ${ccy} is available.`);

  const asks: Ask[] = [];
  const nameOf = (id: string) => cat.departments.find((d) => d.id === id)?.name;
  const revenueUnits = cat.departments.filter((d) => !d.costCenter);
  const comparable = revenueUnits.filter((d) => PEER_DEPARTMENTS.includes(d.id));
  const deptNote = `Peer revenue figures exist for ${list(comparable.map((d) => d.name))} only.`;
  const namedD = chosen.department
    ? [chosen.department]
    : revenueUnits.filter((d) => mentions(t, d.name)).map((d) => d.id);
  let department = "";
  if (namedD.length === 1) {
    const id = namedD[0]!;
    if (!nameOf(id)) return no(`No department "${id}" in this data.`);
    if (!PEER_DEPARTMENTS.includes(id))
      return no(`Peers report no revenue figure for ${nameOf(id)}. ${deptNote}`);
    department = id;
  } else {
    const choices = comparable.filter((d) => !namedD.length || namedD.includes(d.id));
    if (!choices.length)
      return no(
        `Peers report no revenue figure for ${list(namedD.map(nameOf) as string[])}. ${deptNote}`,
      );
    asks.push({
      field: "department",
      question: "Which department is the question about?",
      choices: choices.map((d) => ({ value: d.id, label: d.name })),
      note: deptNote,
    });
  }

  const supported = cat.periods.filter((per) => cat.peers.some((p) => !peerGap(p, per)));
  const periodNote = `Peer figures exist for ${list(supported)}.`;
  const namedP = chosen.period ? [chosen.period] : periodsNamed(t, cat.periods);
  let period = "";
  if (namedP.length === 1) {
    const per = namedP[0]!;
    if (!cat.periods.includes(per))
      return no(`No data for ${per}; the data holds ${list(cat.periods)}.`);
    if (!supported.includes(per))
      return no(`No peer reports credit revenue for ${per}. ${periodNote}`);
    period = per;
  } else {
    const choices = supported.filter((per) => !namedP.length || namedP.includes(per));
    if (!choices.length)
      return no(`No peer reports credit revenue for ${list(namedP)}. ${periodNote}`);
    asks.push({
      field: "period",
      question: "Which period is the question about?",
      choices: choices.map((per) => ({ value: per, label: per })),
      note: periodNote,
    });
  }
  if (asks.length) return { kind: "ambiguous", asks };

  const cohort = cat.peers.filter((p) => !peerGap(p, period)).map((p) => p.id);
  const named = cat.peers.filter((p) => mentions(t, p.name));
  const gaps = named.map((p) => peerGap(p, period)).filter((g) => g !== null);
  if (gaps.length) return no(`${gaps.join("; ")}.`);
  if (named.length && named.length < cohort.length)
    return no(
      `The peer benchmark is computed over ${list(cohort.map((id) => cat.peers.find((p) => p.id === id)!.name))} together; a narrower cohort is not computed.`,
    );
  return {
    kind: "resolved",
    scope: {
      entity: cat.entity,
      department,
      period,
      currency: cat.currency,
      cohort,
      definitions: PEER_DEFINITIONS,
    },
    left: cat.peers
      .filter((p) => !cohort.includes(p.id))
      .map((p) => ({ id: p.id, reason: peerGap(p, period)! })),
  };
}

// The scope in a URL: every field, so a link reopens the same scope.
export const SCOPE_KEYS = ["entity", "dept", "period", "ccy", "peers", "defs"] as const;
export type ScopeSearch = Partial<Record<(typeof SCOPE_KEYS)[number], string>>;

export const scopeSearch = (s: Scope): Required<ScopeSearch> => ({
  entity: s.entity,
  dept: s.department,
  period: s.period,
  ccy: s.currency,
  peers: s.cohort.join(","),
  defs: s.definitions.join(","),
});

/** A link's scope, checked against the data by the same rules as a question; undefined when it carries none. */
export function readScope(
  search: ScopeSearch,
  cat: Catalog,
): { scope: Scope; left: { id: string; reason: string }[] } | { reason: string } | undefined {
  if (!SCOPE_KEYS.some((k) => search[k] !== undefined)) return undefined;
  const missing = SCOPE_KEYS.filter((k) => !search[k]);
  if (missing.length) return { reason: `the link leaves out ${list(missing)}.` };
  if (search.entity !== cat.entity)
    return { reason: `${search.entity} is not this workspace's entity.` };
  if (search.ccy !== cat.currency)
    return { reason: `figures are held in ${cat.currency}, not ${search.ccy}.` };
  const r = resolveScope("peers", cat, { department: search.dept!, period: search.period! });
  if (r.kind === "unsupported") return { reason: r.reason };
  if (r.kind === "ambiguous") return { reason: "the link does not settle the scope." };
  const s = scopeSearch(r.scope);
  if (search.peers !== s.peers)
    return { reason: `the peer benchmark is computed over ${s.peers}, not ${search.peers}.` };
  if (search.defs !== s.defs)
    return { reason: `the definitions for this scope are ${s.defs}, not ${search.defs}.` };
  return { scope: r.scope, left: r.left };
}
