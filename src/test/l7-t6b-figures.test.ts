import { describe, expect, it } from "vitest";

import { SUGGESTIONS } from "@/lib/copilot";
import { callTool, vetDraft } from "@/lib/model";
import { demoRepo } from "@/repo/demo";

// L7 T6b (the council's F6): a figure in a draft must be a figure a tool returned, with its sign,
// unit and scale; digits inside an id or a date are not figures.
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const Q = SUGGESTIONS[0]!;
const finance = () =>
  callTool(
    { name: "finance_answer", args: { question: Q } },
    { user: CRO, domain: "performance", repo: demoRepo },
  ).then((r) => [r]);
const inventory = () =>
  callTool(
    { name: "model_inventory", args: {} },
    { user: CRO, domain: "models", repo: demoRepo },
  ).then((r) => [r]);

describe("the draft check reads figures whole (L7 T6b)", () => {
  it("withholds a returned figure with its sign flipped", async () => {
    expect(vetDraft("The gap to peers is a gain of +$30.0M.", Q, await finance())).toMatch(
      /\+\$30\.0M/,
    );
  });

  it("withholds a returned number given another unit or scale", async () => {
    const out = vetDraft("Credit revenue fell 30.0% to $5.3M.", Q, await finance());
    expect(out).toMatch(/30\.0%/);
    expect(out).toMatch(/\$5\.3M/);
  });

  it("withholds a count taken from the digits of a date", async () => {
    expect(
      vetDraft("11 models are on Watch.", "Which models are on watch?", await inventory()),
    ).toMatch(/11/);
  });

  it("withholds a figure written in words", async () => {
    expect(vetDraft("Revenue fell by ninety million dollars.", Q, await finance())).toMatch(
      /in words/,
    );
  });

  it("lets through figures, ids and dates restated as the tools gave them", async () => {
    const r = await finance();
    expect(
      vetDraft(
        "Credit revenue was $120.0M against a $150.0M benchmark, a gap of −$30.0M; growth was 5.3% in FY2025.",
        Q,
        r,
      ),
    ).toBeNull();
    expect(vetDraft("The gap to the benchmark is $30.0M.", Q, r)).toBeNull();
    expect(
      vetDraft(
        "MDL-002 is next reviewed on 2025-11-03.",
        "When is MDL-002 reviewed?",
        await inventory(),
      ),
    ).toBeNull();
  });
});
