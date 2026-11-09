import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEMO_ENTITY } from "@/lib/evidence";
import { catalogOf, resolveScope, scopeSearch } from "@/lib/scope";
import { demoRepo } from "@/repo/demo";
import { open, setUp } from "./a11y";

setUp();

const click = (el: HTMLElement) =>
  act(async () => {
    fireEvent.click(el);
  });

describe("scope in the UI (L5 T1)", () => {
  it("asks in the copilot until the scope is chosen, then answers with the scope in the link", async () => {
    const router = await open("/crime");
    const q = "Why did our revenue grow more slowly than competitors?";
    const input = screen.getByRole("textbox", { name: "Ask BankIntelli" });
    fireEvent.change(input, { target: { value: q } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });
    expect(await screen.findByText("Scope needed before an answer")).toBeInTheDocument();
    expect(screen.queryByText("Credit performance vs peer group")).toBeNull();

    const group = (name: RegExp) => screen.getAllByRole("group", { name })[0]!;
    await click(within(group(/Which department/)).getByRole("button", { name: "Credit" }));
    await click(within(group(/Which period/)).getByRole("button", { name: "FY2025" }));
    expect(await screen.findByText("Credit performance vs peer group")).toBeInTheDocument();
    expect(screen.getByText(`${q} · Credit · FY2025`)).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "Revenue bridge" }));
    const c = catalogOf(await demoRepo.finance.read(), DEMO_ENTITY);
    const r = resolveScope(q, c, { department: "credit", period: "FY2025" });
    if (r.kind !== "resolved") throw new Error(r.kind);
    expect(router.state.location.pathname).toBe("/performance");
    expect(router.state.location.search).toEqual(scopeSearch(r.scope));
    const panel = (await screen.findByText("Scope from the question")).closest("section")!;
    for (const text of [
      DEMO_ENTITY,
      "Credit",
      "FY2025",
      "USD millions",
      "Harborline Financial, Meridian Trust Bank, Cascade Federal",
      "Credit revenue",
      "Ironwood Bancorp",
      "Solent Commercial",
    ])
      expect(panel, text).toHaveTextContent(text);
    expect(screen.getByRole("tab", { name: "Revenue gap" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }, 30_000);

  it("shows a link whose scope the data does not support as unsupported", async () => {
    const c = catalogOf(await demoRepo.finance.read(), DEMO_ENTITY);
    const r = resolveScope(
      "Why did our credit division revenue grow more slowly than our competitors this year?",
      c,
    );
    if (r.kind !== "resolved") throw new Error(r.kind);
    const search = new URLSearchParams({ ...scopeSearch(r.scope), period: "FY2019" });
    await open(`/performance?${search}`);
    expect(screen.getByText(/The scope in this link is not supported/)).toHaveTextContent("FY2019");
    expect(screen.queryByText("Scope from the question")).toBeNull();
  }, 30_000);
});
