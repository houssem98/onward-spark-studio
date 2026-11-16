import { describe, expect, it } from "vitest";

import { answer } from "@/lib/copilot";
import { toolsFor } from "@/lib/model";
import { LISTED_BANKS } from "@/lib/tn-filings";
import { demoRepo } from "@/repo/demo";

// L7 T10b: asked "what biat revenue", the model called the bank's own finance tool and found nothing.
// The tools' descriptions are all the model reads to choose, so they must say which banks each covers.
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const describe_ = (name: string) =>
  toolsFor(CRO, "performance").find((t) => t.name === name)!.description;

describe("a bank's revenue reaches the sector tool (L7 T10b)", () => {
  it("names every listed bank in the sector tool, and calls a bank's revenue its net banking income", () => {
    const d = describe_("tn_sector");
    for (const bank of Object.values(LISTED_BANKS)) expect(d).toContain(bank);
    expect(d).toMatch(/revenue \(net banking income\)/i);
  });

  it("says the finance tool holds the bank's own data and nothing on other banks", () => {
    expect(describe_("finance_answer")).toMatch(/own .*nothing on other banks/i);
  });

  it("does not claim in the routing's answer that no model is connected", async () => {
    const data = {
      finance: await demoRepo.finance.read(),
      models: await demoRepo.models.read(),
      datasets: await demoRepo.datasets.read(),
      crime: await demoRepo.crime.read(),
    };
    const a = answer("what biat revenue", data);
    expect(a.intent).toBe("Unrecognized question");
    expect(a.missing.join(" ")).not.toMatch(/no live ai provider/i);
    expect(a.missing).toEqual(["Not one of the routing's fixed questions"]);
  });
});
