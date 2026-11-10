import type { ModelClient, ToolCall } from "@/lib/model";

// Server only: the `.server` suffix makes the build refuse this module in the browser bundle.
const ENDPOINT = "https://api.deepseek.com/chat/completions";

interface Reply {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: { function: { name: string; arguments: string } }[];
    };
  }[];
}

const args = (raw: string): ToolCall["args"] => {
  try {
    return JSON.parse(raw) as ToolCall["args"];
  } catch {
    throw new Error("The model sent tool arguments that are not JSON.");
  }
};

export const deepseek =
  (key: string, fetchImpl: typeof fetch = fetch): ModelClient =>
  async ({ system, question, tools }) => {
    const res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
        ...(tools.length ? { tools: tools.map((t) => ({ type: "function", function: t })) } : {}),
      }),
    });
    if (!res.ok) throw new Error(`The model service answered ${res.status}.`);
    const m = ((await res.json()) as Reply).choices?.[0]?.message;
    if (!m) throw new Error("The model service sent no answer.");
    return {
      text: m.content ?? "",
      calls: (m.tool_calls ?? []).map((c) => ({
        name: c.function.name,
        args: args(c.function.arguments),
      })),
    };
  };
