import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { demoRepo } from "@/repo/demo";
import { clickTab, open, setUp } from "./a11y";

setUp();
afterEach(() => vi.restoreAllMocks());

const click = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });

describe("long-running writes (L5 T6)", () => {
  it("says why a version was not saved, and saves it on retry", async () => {
    const router = await open("/reports/RPT-FY25-PERF");
    vi.spyOn(demoRepo.reports, "save").mockRejectedValueOnce(new Error("Storage unavailable"));
    await click("Save version");
    expect(await screen.findByRole("alert")).toHaveTextContent("Not saved: Storage unavailable");
    expect((router.state.location.search as { v?: number }).v).toBeUndefined();
    await click("Retry");
    expect(await screen.findByText(/^Version \d+, saved/)).toBeInTheDocument();
    expect((router.state.location.search as { v?: number }).v).toBeGreaterThan(0);
  }, 30_000);

  it("says why the wizard's investigation was not created, keeps the wizard, and creates it on retry", async () => {
    await open("/performance");
    await clickTab("Root-cause engine");
    // Before the steps re-render the page: its actions take the repository's function at render.
    vi.spyOn(demoRepo.investigations, "create").mockRejectedValueOnce(
      new Error("Permission denied"),
    );
    for (let i = 0; i < 9; i++) await click("Next");
    await click("Create investigation");
    expect(await screen.findByRole("alert")).toHaveTextContent("Not created: Permission denied");
    expect(screen.queryByText(/created\./)).toBeNull();
    await click("Retry");
    expect(await screen.findByText(/created\./)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  }, 30_000);
});
