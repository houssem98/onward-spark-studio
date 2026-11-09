import { describe, expect, it } from "vitest";

import type { Investigation } from "@/data/investigations";
import { withPolicyStates } from "@/lib/evidence-policy";
import { demoRepo } from "@/repo/demo";
import { productionRepo } from "@/repo/production";

// INV-2026-003's one finding, made to name a registry metric (which since T6d a finding needs to
// reach VERIFIED), is VERIFIED by the policy on its facts; one item is still open.
const base = async () => {
  const inv = (await demoRepo.investigations.read()).investigations.find(
    (i) => i.id === "INV-2026-003",
  )!;
  return withPolicyStates({
    ...inv,
    findings: inv.findings.map((f) => ({ ...f, metricId: "outstanding_balance" as const })),
  });
};

describe("only the policy sets VERIFIED (L4 T4)", () => {
  it("refuses a finding written as VERIFIED that its facts do not verify", async () => {
    const inv = await base();
    expect(inv.findings[0]!.state).toBe("VERIFIED");
    const forged: Investigation = {
      ...inv,
      id: "INV-FORGED-1",
      findings: inv.findings.map((f) => ({ ...f, facts: { sources: [] } })),
    };
    await expect(demoRepo.investigations.create(forged)).rejects.toThrow(/evidence policy/);
    await expect(productionRepo.investigations.create(forged)).rejects.toThrow(/evidence policy/);
  });

  it("refuses an investigation written as VERIFIED that its findings do not verify", async () => {
    const inv = await base();
    const forged: Investigation = { ...inv, id: "INV-FORGED-2", state: "VERIFIED" };
    await expect(demoRepo.investigations.create(forged)).rejects.toThrow(/evidence policy/);
  });

  it("keeps a VERIFIED the policy gives", async () => {
    const inv = await base();
    await demoRepo.investigations.create({ ...inv, id: "INV-POLICY-1" });
    const back = (await demoRepo.investigations.read()).investigations.find(
      (i) => i.id === "INV-POLICY-1",
    )!;
    expect(back.findings.map((f) => f.state)).toEqual(["VERIFIED"]);
  });
});
