import { describe, expect, it } from "vitest";

import { DEMO_ENTITY } from "@/lib/evidence";
import { catalogOf, readScope, resolveScope, scopeSearch } from "@/lib/scope";
import { demoRepo } from "@/repo/demo";

const catalog = async () => catalogOf(await demoRepo.finance.read(), DEMO_ENTITY);
const FLAGSHIP =
  "Why did our credit division revenue grow more slowly than our competitors this year?";

describe("scope resolution (L5 T1)", () => {
  it("resolves a question that states its department and period", async () => {
    expect(resolveScope(FLAGSHIP, await catalog())).toEqual({
      kind: "resolved",
      scope: {
        entity: DEMO_ENTITY,
        department: "credit",
        period: "FY2025",
        currency: "USD",
        cohort: ["harborline", "meridian", "cascade"],
        definitions: ["credit_revenue", "credit_revenue_growth", "peer_benchmark", "revenue_gap"],
      },
      left: [
        { id: "ironwood", reason: expect.stringContaining("nine-month FY2025 figures only") },
        { id: "solent", reason: expect.stringContaining("no permitted source") },
      ],
    });
  });

  it("asks for what an ambiguous question leaves open instead of guessing", async () => {
    const c = await catalog();
    const open = (q: string, chosen = {}) => {
      const r = resolveScope(q, c, chosen);
      return r.kind === "ambiguous"
        ? r.asks.map((a) => [a.field, a.choices.map((x) => x.value)])
        : r;
    };
    const q = "Why did our revenue grow more slowly than competitors?";
    expect(open(q)).toEqual([
      ["department", ["credit"]],
      ["period", ["FY2025"]],
    ]);
    expect(open("Did credit or retail revenue trail peers in FY2025?")).toEqual([
      ["department", ["credit"]],
    ]);
    expect(open("Did credit revenue trail peers this year or last year?")).toEqual([
      ["period", ["FY2025"]],
    ]);
    // An answer to the ask resolves the same question.
    expect(open(q, { department: "credit" })).toEqual([["period", ["FY2025"]]]);
    expect(resolveScope(q, c, { department: "credit", period: "FY2025" }).kind).toBe("resolved");
  });

  it.each([
    ["What is the weather?", /compares nothing with peers/],
    ["Why did our net interest margin fall against peers in FY2025?", /credit revenue only/],
    ["How did credit revenue compare with peers in FY2025, in euros?", /no conversion to EUR/],
    [
      "How did credit revenue compare with peers in FY2024?",
      /No peer reports credit revenue for FY2024/,
    ],
    ["How did credit revenue compare with peers in FY2019?", /No data for FY2019/],
    ["How did retail revenue compare with peers in FY2025?", /Retail Banking/],
    ["How did credit revenue compare with Ironwood in FY2025?", /nine-month FY2025 figures only/],
    ["How did credit revenue compare with Harborline in FY2025?", /narrower cohort/],
  ])("refuses an unsupported question: %s", async (q, why) => {
    const r = resolveScope(q, await catalog());
    expect(r.kind).toBe("unsupported");
    expect(r.kind === "unsupported" && r.reason).toMatch(why);
  });

  it("carries the scope in the URL, reads the same scope back, and refuses a link the data does not support", async () => {
    const c = await catalog();
    const r = resolveScope(FLAGSHIP, c);
    if (r.kind !== "resolved") throw new Error(r.kind);
    const link = scopeSearch(r.scope);
    expect(link).toEqual({
      entity: DEMO_ENTITY,
      dept: "credit",
      period: "FY2025",
      ccy: "USD",
      peers: "harborline,meridian,cascade",
      defs: "credit_revenue,credit_revenue_growth,peer_benchmark,revenue_gap",
    });
    expect(readScope(link, c)).toEqual({ scope: r.scope, left: r.left });
    expect(readScope({}, c)).toBeUndefined();
    for (const bad of [
      { period: "FY2024" },
      { period: "FY2019" },
      { dept: "retail" },
      { dept: "nowhere" },
      { peers: "harborline" },
      { peers: "harborline,meridian,cascade,solent" },
      { ccy: "EUR" },
      { entity: "Another Bank" },
      { defs: "nim" },
      { defs: "" },
    ])
      expect(readScope({ ...link, ...bad }, c), JSON.stringify(bad)).toEqual({
        reason: expect.any(String),
      });
  });
});
