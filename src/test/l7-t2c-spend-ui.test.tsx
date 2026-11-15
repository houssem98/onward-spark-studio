import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModelSpend } from "@/components/ModelSpend";
import { spendAlert } from "@/lib/model";
import { repo } from "@/repo/queries";

import { open, setUp } from "./a11y";

setUp();

// GET /api/ask as the server answers it; the tests never reach a server.
const serve = (body: object) => {
  const f = vi.fn<typeof fetch>(async (u) =>
    String(u) === "/api/ask" ? Response.json(body) : new Response("", { status: 404 }),
  );
  vi.stubGlobal("fetch", f);
  return f;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const show = async (role: string) => {
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ModelSpend role={role} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

describe("model spend in the copilot panel (L7 T2c)", () => {
  it("shows an admin the month's spend and the alert above $5, in the copilot panel", async () => {
    serve({ monthUsd: 6.4, alert: spendAlert(6.4) });
    vi.spyOn(repo.session, "read").mockResolvedValue({ user: { name: "A. Admin", role: "Admin" } });
    await open("/");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copilot" }));
    });
    const panel = await screen.findByRole("dialog");
    expect(await screen.findByText("Model spend this month: $6.40")).toBeInTheDocument();
    expect(panel).toContainElement(screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Model spend this month is $6.40, above the $5 alert. Calls are not blocked.",
    );
  });

  it("shows an analyst neither the spend nor the alert, and does not ask for them", async () => {
    const f = serve({ monthUsd: 6.4, alert: spendAlert(6.4) });
    await show("Credit analyst");
    expect(screen.queryByText(/Model spend/)).not.toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });

  it("shows the chief risk officer the spend below $5 with no alert", async () => {
    serve({ monthUsd: 3.2, alert: spendAlert(3.2) });
    await show("Chief Risk Officer");
    expect(screen.getByText("Model spend this month: $3.20")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says spend is not tracked rather than showing $0", async () => {
    serve({ untracked: "Model spend is not tracked: the model_calls table is not configured." });
    await show("Admin");
    expect(screen.getByText(/Model spend is not tracked/)).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
  });
});
