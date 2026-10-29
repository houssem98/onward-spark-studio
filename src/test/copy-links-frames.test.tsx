import { readdirSync, readFileSync } from "node:fs";
import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NAV_GROUPS } from "@/components/AppShell";
import { clickTab, open, setUp } from "./a11y";

setUp();

const main = () => document.querySelector("main")?.textContent ?? "";
const caption = (title: string) =>
  [...document.querySelectorAll("figure")]
    .find((f) => f.textContent?.includes(title))
    ?.querySelector("figcaption")?.textContent ?? "";

describe("links", () => {
  it.each(["/reports/NOPE", "/investigations/NOPE"])(
    "shows the not-found page for %s",
    async (path) => {
      await open(path);
      expect(document.body.textContent).toMatch(/Page not found/);
    },
  );

  it("falls back to the overview for an unknown model tab", async () => {
    await open("/models/MDL-001?tab=bogus");
    expect(main()).toMatch(/Registry record/);
  });

  it("labels each breadcrumb the way the navigation labels its page", () => {
    const nav = new Map<string, string>(
      NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.to, i.label])),
    );
    const crumbs = readdirSync("src/routes").flatMap((f) =>
      [
        ...readFileSync(`src/routes/${f}`, "utf8").matchAll(
          /\{ label: "([^"]+)", to: "([^"]+)" \}/g,
        ),
      ].map((m) => ({ f, label: m[1]!, to: m[2]! })),
    );
    expect(crumbs.length).toBeGreaterThan(0);
    expect(
      crumbs
        .filter((c) => nav.get(c.to) !== c.label)
        .map((c) => `${c.f}: "${c.label}" for ${c.to}, the nav says "${nav.get(c.to)}"`),
    ).toEqual([]);
  });
});

describe("frames state their real period and source", () => {
  it("names the 9-month period of a peer in the peer chart", async () => {
    await open("/performance");
    await clickTab("Peer benchmarking");
    expect(caption("Net interest margin (%)")).toMatch(/9M annualized/);
  });

  it("dates the prior-period bridge FY2024 to FY2025", async () => {
    await open("/performance");
    await clickTab("Revenue gap");
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Method"), { target: { value: "prior" } });
    });
    expect(caption("Credit revenue bridge")).toMatch(/FY2024 to FY2025/);
  });

  it("frames the credit funnel", async () => {
    await open("/credit");
    expect(caption("Credit lifecycle funnel")).toMatch(/Source:/);
  });

  it("frames the data-quality dimension scores", async () => {
    await open("/data");
    await clickTab("Data quality");
    expect(caption("Dimension scores")).toMatch(/Source:/);
  });
});
