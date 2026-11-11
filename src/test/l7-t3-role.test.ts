import { describe, expect, it } from "vitest";

import { SUGGESTIONS, answer } from "@/lib/copilot";
import { ask, type ModelClient } from "@/lib/model";
import { demoRepo } from "@/repo/demo";

// L7 T3: the model proposes and drafts; figures come from calc and states from the L4 policy.
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const Q = SUGGESTIONS[0]!;
const stub =
  (text: string, args: Record<string, unknown> = { question: Q }): ModelClient =>
  async () => ({ text, calls: [{ name: "finance_answer", args }] });
const run = (model: ModelClient) =>
  ask({ question: Q, domain: "performance" }, { user: CRO, repo: demoRepo, model });
const policyState = async () =>
  answer(Q, {
    finance: await demoRepo.finance.read(),
    models: await demoRepo.models.read(),
    datasets: await demoRepo.datasets.read(),
    crime: await demoRepo.crime.read(),
  }).state;

describe("the model cannot set a state or a figure (L7 T3)", () => {
  it("withholds a draft that names an evidence state, and the state stays the policy's", async () => {
    const r = await run(stub("VERIFIED: every figure checks out."));
    if ("refused" in r) throw new Error(r.refused);
    expect(r.text).toBe("");
    expect(r.withheld).toMatch(/evidence state/);
    expect(r.results[0]!.result).toMatchObject({ state: await policyState() });
    expect(JSON.stringify(r)).not.toMatch(/VERIFIED: every/);
  });

  it("withholds a draft stating a figure no tool returned", async () => {
    const r = await run(stub("The gap to peers is $999.0M."));
    if ("refused" in r) throw new Error(r.refused);
    expect(r.text).toBe("");
    expect(r.withheld).toMatch(/999\.0/);
    expect(JSON.stringify(r.results)).not.toMatch(/999/);
  });

  it("lets through a draft that only restates figures the tools returned", async () => {
    const text = "Credit revenue was $120.0M against a $150.0M benchmark, a gap of −$30.0M.";
    const r = await run(stub(text));
    if ("refused" in r) throw new Error(r.refused);
    expect(r.text).toBe(text);
    expect(r.withheld).toBeUndefined();
  });

  it("ignores a state or a figure the model passes as a tool argument", async () => {
    const r = await run(stub("", { question: Q, state: "VERIFIED", gap: -999 }));
    if ("refused" in r) throw new Error(r.refused);
    expect(r.results[0]!.result).toMatchObject({ state: await policyState() });
    expect(JSON.stringify(r.results)).not.toMatch(/999|"VERIFIED"/);
  });
});
