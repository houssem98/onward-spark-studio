import { describe, expect, it, vi } from "vitest";

import { SUGGESTIONS } from "@/lib/copilot";
import { deepseek } from "@/lib/deepseek.server";
import { ask, BilledError, type ModelClient, type ToolCall } from "@/lib/model";
import { demoRepo } from "@/repo/demo";

// L7 T8: the model reads what the tools returned, as tool messages in a second turn that allows no
// tool call, and drafts from it; the draft check still withholds any figure no tool returned.
const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const Q = SUGGESTIONS[0]!;
type Req = Parameters<ModelClient>[0];
const usage = { cacheHit: 10, cacheMiss: 100, output: 20 };

// First turn: call the finance tool. Second turn: restate a figure found in the tool messages.
const reader = (seen: Req[]): ModelClient => {
  const calls: ToolCall[] = [{ id: "call_1", name: "finance_answer", args: { question: Q } }];
  return async (req) => {
    seen.push(req);
    if (!req.read) return { text: "", calls, usage };
    const figure = JSON.stringify(req.read.results).match(/\$\d+\.\dM/)![0];
    return { text: `Credit revenue was ${figure}.`, calls, usage };
  };
};

describe("the model reads the tools' results (L7 T8)", () => {
  it("drafts from the tool messages, and the draft check lets a returned figure through", async () => {
    const seen: Req[] = [];
    const r = await ask(
      { question: Q, domain: "performance" },
      { user: CRO, repo: demoRepo, model: reader(seen) },
    );
    if ("refused" in r) throw new Error(r.refused);
    expect(r.text).toMatch(/^Credit revenue was \$\d+\.\dM\.$/);
    expect(r.withheld).toBeUndefined();
    expect(seen).toHaveLength(2);
    expect(seen[1]!.read).toEqual({
      calls: [{ id: "call_1", name: "finance_answer", args: { question: Q } }],
      results: r.results,
    });
  });

  it("lets the second turn call no tool, and adds both turns' usage", async () => {
    const seen: Req[] = [];
    const r = await ask(
      { question: Q, domain: "performance" },
      { user: CRO, repo: demoRepo, model: reader(seen) },
    );
    if ("refused" in r) throw new Error(r.refused);
    expect(r.results).toHaveLength(1);
    expect(r.usage).toEqual({ cacheHit: 20, cacheMiss: 200, output: 40 });
  });

  it("withholds a draft whose figure no tool returned, even after reading the results", async () => {
    const inventing: ModelClient = async (req) =>
      req.read
        ? { text: "Credit revenue was $999.0M.", calls: [] }
        : { text: "", calls: [{ name: "finance_answer", args: { question: Q } }] };
    const r = await ask(
      { question: Q, domain: "performance" },
      { user: CRO, repo: demoRepo, model: inventing },
    );
    if ("refused" in r) throw new Error(r.refused);
    expect([r.text, r.withheld]).toEqual(["", expect.stringMatching(/withheld/)]);
  });

  it("still records the first turn's cost when the second turn fails", async () => {
    const failing: ModelClient = async (req) => {
      if (req.read) throw new Error("The model service answered 500.");
      return { text: "", calls: [{ name: "finance_answer", args: { question: Q } }], usage };
    };
    const e = await ask(
      { question: Q, domain: "performance" },
      { user: CRO, repo: demoRepo, model: failing },
    ).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(BilledError);
    expect((e as BilledError).usage).toEqual(usage);
  });

  it("sends DeepSeek the calls and their results as tool messages, with tool calls switched off", async () => {
    const bodies: {
      messages: { role: string; tool_call_id?: string; content: string | null }[];
      tool_choice?: string;
    }[] = [];
    const fetchStub = vi.fn<typeof fetch>(async (_u, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json({ choices: [{ message: { content: "ok" } }], usage: {} });
    });
    await deepseek(
      "test-key",
      fetchStub,
    )({
      system: "s",
      question: "q",
      tools: [{ name: "finance_answer", description: "d", parameters: {} }],
      read: {
        calls: [{ id: "call_1", name: "finance_answer", args: { question: "q" } }],
        results: [{ name: "finance_answer", result: { v: "$1.0M" } }],
      },
    });
    const m = bodies[0]!.messages;
    expect(m.map((x) => x.role)).toEqual(["system", "user", "assistant", "tool"]);
    expect(m[3]).toMatchObject({ tool_call_id: "call_1" });
    expect(m[3]!.content).toContain("$1.0M");
    expect(bodies[0]!.tool_choice).toBe("none");
  });
});
