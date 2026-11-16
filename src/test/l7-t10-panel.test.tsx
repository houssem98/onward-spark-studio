import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModelDraft } from "@/components/ModelDraft";
import { askModel, domainOf } from "@/lib/ask-client";
import { SUGGESTIONS } from "@/lib/copilot";

import { open, setUp } from "./a11y";

setUp();

// L7 T10: the copilot panel asks the model through /api/ask when the server has its key, and shows
// the model's draft above the figures and state the tools computed; without a key, the routing
// answers as before and the panel says so. The tests never reach a server. Only one test opens the
// panel: a second open of its dialog in the same file stalls jsdom, with or without this change.
const serve = (reply: { status?: number; body: object }) => {
  const f = vi.fn<typeof fetch>(async (u, init) =>
    String(u) === "/api/ask"
      ? init?.method === "POST"
        ? Response.json(reply.body, { status: reply.status ?? 200 })
        : Response.json({ untracked: "Model spend is not tracked." })
      : new Response("", { status: 404 }),
  );
  vi.stubGlobal("fetch", f);
  return f;
};
const Q = SUGGESTIONS[0]!;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the copilot panel asks the model (L7 T10)", () => {
  it("shows the model's draft above the tools' figures and the policy's state", async () => {
    const f = serve({
      body: {
        text: "Credit revenue grew 5.3%, below the peer group.",
        results: [{ name: "finance_answer" }],
      },
    });
    await open("/");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copilot" }));
    });
    const input = await screen.findByRole("textbox", { name: "Question for the copilot" });
    fireEvent.change(input, { target: { value: Q } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });
    const draft = await screen.findByText("Credit revenue grew 5.3%, below the peer group.");
    expect(screen.getByText(/From finance_answer/)).toBeInTheDocument();
    const routed = screen.getByText("Credit performance vs peer group");
    expect(draft.compareDocumentPosition(routed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const post = f.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(post[1]!.body))).toEqual({ question: Q, domain: "performance" });
    // It renders the whole app, which under the full suite's load takes longer than 5 s.
  }, 30_000);

  it("says when no model is connected, so the routing's answer stands alone", async () => {
    serve({ status: 503, body: { refused: "The model is not configured." } });
    const reply = await askModel(Q);
    expect(reply).toEqual({ note: expect.stringMatching(/^No model is connected here/) });
    render(<ModelDraft reply={reply} />);
    expect(screen.getByText(/No model is connected here/)).toBeInTheDocument();
  });

  it("shows why a withheld draft was withheld, and no draft", async () => {
    const withheld = "The model's draft was withheld: it states a figure no tool returned.";
    serve({ body: { text: "", withheld, results: [{ name: "finance_answer" }] } });
    const reply = await askModel(Q);
    render(<ModelDraft reply={reply} />);
    expect(screen.getByText(withheld)).toBeInTheDocument();
    expect(screen.queryByText("Credit revenue")).not.toBeInTheDocument();
  });

  it("says when the model cannot be reached instead of failing the answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    expect(await askModel(Q)).toEqual({ note: expect.stringMatching(/could not be reached/) });
  });

  it("asks each question in its domain", () => {
    expect(domainOf("Which models are on watch?")).toBe("models");
    expect(domainOf("Which datasets are certified?")).toBe("data");
    expect(domainOf("How does BIAT compare with the listed Tunisian banks?")).toBe("performance");
  });
});
