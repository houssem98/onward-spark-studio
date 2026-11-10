import { describe, expect, it, vi } from "vitest";

import { deepseek } from "@/lib/deepseek.server";
import { ask, callTool, screen, toolsFor, type ModelClient } from "@/lib/model";
import { demoRepo } from "@/repo/demo";
import { productionRepo } from "@/repo/production";

const CRO = { name: "Sarah Mitchell", role: "Chief Risk Officer" };
const ANALYST = { name: "G. Rossi", role: "Credit analyst" };
const VALIDATOR = { name: "M. Okafor", role: "Model validator" };

describe("tools the model may call (L7 T2)", () => {
  it("offers a user only the tools their role and the task's domain allow", () => {
    const names = (u: typeof CRO, d: Parameters<typeof toolsFor>[1]) =>
      toolsFor(u, d).map((t) => t.name);
    expect(names(ANALYST, "performance")).toEqual(["finance_answer"]);
    expect(names(ANALYST, "models")).toEqual([]);
    expect(names(VALIDATOR, "models")).toEqual(["model_inventory"]);
    expect(names(VALIDATOR, "performance")).toEqual([]);
  });

  it("refuses a tool outside the task's domain or the user's role, and runs one inside both", async () => {
    const ctx = { user: ANALYST, repo: demoRepo };
    const outOfDomain = await callTool(
      { name: "model_inventory", args: {} },
      { ...ctx, domain: "performance" },
    );
    expect(outOfDomain.refused).toMatch(/not available to Credit analyst for performance/);
    expect(outOfDomain.result).toBeUndefined();
    const outOfRole = await callTool(
      { name: "model_inventory", args: {} },
      { ...ctx, domain: "models" },
    );
    expect(outOfRole.refused).toMatch(/not available to Credit analyst for models/);
    const unknown = await callTool(
      { name: "delete_everything", args: {} },
      { ...ctx, domain: "performance" },
    );
    expect(unknown.refused).toBeDefined();
    const allowed = await callTool(
      {
        name: "finance_answer",
        args: { question: "Why did our credit revenue lag our peers this year?" },
      },
      { ...ctx, domain: "performance" },
    );
    expect(allowed.refused).toBeUndefined();
    expect(allowed.result).toMatchObject({ intent: "Credit performance vs peer group" });
  });

  it("sends no real data to the model: every tool refuses outside the demo", async () => {
    const r = await callTool(
      {
        name: "finance_answer",
        args: { question: "Why did our credit revenue lag our peers this year?" },
      },
      { user: CRO, repo: productionRepo, domain: "performance" },
    );
    expect(r.refused).toMatch(/Only synthetic data/);
  });
});

describe("screening a question before it leaves the bank (L7 T1, T2)", () => {
  it.each([
    "Why did client jane.doe@example.com stop paying?",
    "Show account 12345678901 history",
    "Is TN59 1000 6035 1835 9847 8831 overdrawn?",
  ])("refuses %s", (q) => expect(screen(q)).not.toBeNull());

  it("lets a question about figures and years through", () => {
    expect(screen("Why did our credit revenue lag our peers in FY2025 versus 2024?")).toBeNull();
  });
});

describe("the ask pipeline (L7 T2)", () => {
  const stub = (turn: Awaited<ReturnType<ModelClient>>) => vi.fn<ModelClient>(async () => turn);

  it("never calls the model with a screened question", async () => {
    const model = stub({ text: "", calls: [] });
    const r = await ask(
      { question: "Why did client jane.doe@example.com stop paying?", domain: "performance" },
      { user: CRO, repo: demoRepo, model },
    );
    expect(r.refused).toBeDefined();
    expect(model).not.toHaveBeenCalled();
  });

  it("offers the model only the allowed tools, and refuses a call to any other", async () => {
    const model = stub({ text: "draft", calls: [{ name: "model_inventory", args: {} }] });
    const r = await ask(
      { question: "Why did our credit revenue lag our peers this year?", domain: "performance" },
      { user: ANALYST, repo: demoRepo, model },
    );
    expect(model.mock.calls[0]![0].tools.map((t) => t.name)).toEqual(["finance_answer"]);
    expect(r.results?.[0]?.refused).toMatch(/not available/);
  });
});

describe("the DeepSeek adapter (L7 T2), against a stub, never the live service", () => {
  const reply = (body: unknown, status = 200) =>
    vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
  const req = {
    system: "s",
    question: "q",
    tools: [{ name: "finance_answer", description: "d", parameters: { type: "object" } }],
  };

  it("posts the question and tools with the key, and reads back text and tool calls", async () => {
    const f = reply({
      choices: [
        {
          message: {
            content: "draft",
            tool_calls: [{ function: { name: "finance_answer", arguments: '{"question":"q"}' } }],
          },
        },
      ],
    });
    const turn = await deepseek("sk-test-key", f)(req);
    expect(turn).toEqual({
      text: "draft",
      calls: [{ name: "finance_answer", args: { question: "q" } }],
    });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(new Headers(init!.headers).get("authorization")).toBe("Bearer sk-test-key");
    expect(JSON.parse(init!.body as string)).toMatchObject({
      model: "deepseek-chat",
      tools: [{ type: "function", function: { name: "finance_answer" } }],
    });
  });

  it("fails with an explicit message, and never the key, when the service refuses or sends nothing", async () => {
    await expect(deepseek("sk-test-key", reply({}, 401))(req)).rejects.toThrow(
      "The model service answered 401.",
    );
    await expect(deepseek("sk-test-key", reply({ choices: [] }))(req)).rejects.toThrow(
      "The model service sent no answer.",
    );
    const bad = reply({
      choices: [
        { message: { content: "", tool_calls: [{ function: { name: "x", arguments: "{" } }] } },
      ],
    });
    await expect(deepseek("sk-test-key", bad)(req)).rejects.toThrow(/not JSON/);
    const err = await deepseek("sk-test-key", reply({}, 500))(req).catch((e: Error) => e.message);
    expect(err).not.toContain("sk-test-key");
  });
});
