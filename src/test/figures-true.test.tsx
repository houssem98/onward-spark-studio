import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Kpi } from "@/components/kit";
import { DATA_STATES } from "@/components/states";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";
import { repo } from "@/repo/queries";
import { open, setUp } from "./a11y";

setUp();
afterEach(() => vi.restoreAllMocks());

const tile = (def: string) =>
  document.querySelector(`main [data-definition="${def}"]`)?.textContent ?? "";

const RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function queue() {
  const panel = [...document.querySelectorAll("main h2")]
    .find((h) => h.textContent === "Needs attention")!
    .closest("section")!;
  return {
    subtitle: panel.querySelector("header p")?.textContent ?? "",
    items: [...panel.querySelectorAll<HTMLElement>("li")],
  };
}

describe("figures read true", () => {
  it("draws the delta arrow by the sign of the change", async () => {
    const wrong: string[] = [];
    for (const path of ["/", "/performance", "/credit"]) {
      cleanup();
      await open(path);
      for (const el of document.querySelectorAll<HTMLElement>("main [data-definition]")) {
        const m = (el.textContent ?? "").match(/([▲▼]) ([-+−]?[\d.,]+)/);
        if (!m) continue;
        const up = parseFloat(m[2]!.replace("−", "-").replace(/,/g, "")) > 0;
        if ((m[1] === "▲") !== up) wrong.push(`${path} ${el.dataset["definition"]}: ${m[0]}`);
      }
    }
    expect(wrong).toEqual([]);
  }, 120_000);

  it("still colours a rise in costs as bad", async () => {
    await open("/performance");
    const el = document.querySelector('main [data-definition="operating_expenses"]')!;
    expect(el.querySelector(".text-critical")?.textContent).toMatch(/^▲ /);
  }, 60_000);

  it("shows Unavailable, not 0.0d, for average alert age with no open alert", async () => {
    const real = repo.crime.read.bind(repo.crime);
    vi.spyOn(repo.crime, "read").mockImplementation(async () => {
      const r = await real();
      return { ...r, alerts: r.alerts.map((a) => ({ ...a, status: "Closed" as const })) };
    });
    await open("/crime");
    expect(tile("avg_alert_age")).toContain("Unavailable");
    expect(tile("avg_alert_age")).not.toContain("0.0d");
  }, 60_000);

  it("lists the most severe open records first and says how many it shows", async () => {
    await open("/");
    const { subtitle, items } = queue();
    expect(subtitle).toMatch(/^Top \d+ of \d+ open/);
    const ranks = items.map((li) => RANK[li.dataset["severity"] ?? ""] ?? -1);
    expect(ranks.filter((r) => r < 0)).toEqual([]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  }, 60_000);

  it("drops the revenue-gap investigation from the queue once it is closed", async () => {
    const real = repo.investigations.read.bind(repo.investigations);
    const gap = (await real()).investigations
      .filter((i) => i.module === "Performance")
      .reduce((a, b) => (b.created < a.created ? b : a));
    vi.spyOn(repo.investigations, "read").mockImplementation(async () => {
      const r = await real();
      return {
        ...r,
        investigations: r.investigations.map((i) =>
          i.id === gap.id ? { ...i, status: "Closed" as const } : i,
        ),
      };
    });
    await open("/");
    expect(
      queue()
        .items.map((li) => li.textContent)
        .join("|"),
    ).not.toContain(gap.title);
  }, 60_000);

  it("keeps unit, period and source on a KPI in every data state", () => {
    const d = DEFINITIONS.npl_ratio;
    const lost = DATA_STATES.filter((state) => {
      render(
        <TooltipProvider>
          <Kpi basis def="npl_ratio" value="5%" state={state} />
        </TooltipProvider>,
      );
      const kept = document.body.textContent?.includes(`${d.unit} · ${d.period} · ${d.source}`);
      cleanup();
      return !kept;
    });
    expect(lost).toEqual([]);
  });
});
