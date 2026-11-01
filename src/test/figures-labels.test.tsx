import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { stepTooltip } from "@/lib/calc";
import { answer } from "@/lib/copilot";
import { DEFINITIONS } from "@/lib/definitions";
import { demoRepo } from "@/repo/demo";
import { open, setUp } from "./a11y";

setUp();

const tile = (def: string) => document.querySelector(`[data-definition="${def}"]`)?.textContent;

describe("figures say what they are", () => {
  it("gives every registry metric a real unit", () => {
    const placeholder = /^(as recorded|n\/?a|tbd|unit|various|)$/i;
    expect(
      Object.entries(DEFINITIONS)
        .filter(([, d]) => placeholder.test(d.unit.trim()))
        .map(([id]) => id),
    ).toEqual([]);
  });

  describe("the overview's open model alerts tile", () => {
    const reopen: (() => Promise<void>)[] = [];
    afterEach(async () => {
      while (reopen.length) await reopen.pop()!();
    });

    it("counts the register's open alerts, in alerts, and its High ones by the same rule", async () => {
      // Change the register: close the High alert, and the count and caption must follow.
      const { driftAlerts } = await demoRepo.models.read();
      const high = driftAlerts.find((a) => a.severity === "High" && a.status !== "Closed")!;
      await demoRepo.models.updateDrift(high.id, { status: "Closed" });
      reopen.push(() => demoRepo.models.updateDrift(high.id, { status: high.status }));
      const after = (await demoRepo.models.read()).driftAlerts;
      const open_ = after.filter((a) => a.status !== "Closed");

      await open("/");
      const text = tile("open_model_alerts")!;
      expect(text).not.toMatch(/\d+\/\d+/);
      expect(text).toContain(`Open model alerts${open_.length}`);
      expect(text).toContain(
        `${open_.filter((a) => a.severity === "High").length} rated High, not closed`,
      );
    });
  });

  it("formats the copilot's missed targets with the shared money formatter", async () => {
    const data = {
      finance: await demoRepo.finance.read(),
      models: await demoRepo.models.read(),
      datasets: await demoRepo.datasets.read(),
      crime: await demoRepo.crime.read(),
    };
    const values = answer("Which business units missed target?", data).metrics.map((m) => m.value);
    expect(values).toContain("$412.0M vs $430.0M (−$18.0M)");
    expect(values.filter((v) => /\(-|\$-/.test(v))).toEqual([]);
  });

  it("prints a waterfall step in the tooltip with a proper minus", () => {
    expect(stepTooltip(0, "value", { payload: { signed: -1.5 } })).toEqual(["−$1.5M", "Value"]);
  });

  it("puts the unit on the watchlist balance and the write-off caption", async () => {
    await open("/credit");
    expect(
      screen
        .getAllByRole("columnheader")
        .map((h) => h.textContent)
        .filter((t) => t === "Balance"),
    ).toEqual([]);
    expect(tile("net_write_offs")).toMatch(/WO \$[\d.,]+M · Rec \$[\d.,]+M/);
  });
});
