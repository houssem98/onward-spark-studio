import { BilledError, PRICE, type ModelClient, type ToolCall } from "@/lib/model";

// Server only: the `.server` suffix makes the build refuse this module in the browser bundle.
const ENDPOINT = "https://api.deepseek.com/chat/completions";

interface Reply {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: { id?: string; function: { name: string; arguments: string } }[];
    };
  }[];
  usage?: {
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    completion_tokens?: number;
  };
}

const args = (raw: string): ToolCall["args"] | undefined => {
  try {
    return JSON.parse(raw) as ToolCall["args"];
  } catch {
    return undefined;
  }
};

export const deepseek =
  (key: string, fetchImpl: typeof fetch = fetch): ModelClient =>
  async ({ system, question, tools, read }) => {
    const id = (c: ToolCall, i: number) => c.id ?? `call_${i}`;
    // The second turn (L7 T8): the first turn's calls, then each result as a tool message.
    const reading = read
      ? [
          {
            role: "assistant",
            content: null,
            tool_calls: read.calls.map((c, i) => ({
              id: id(c, i),
              type: "function",
              function: { name: c.name, arguments: JSON.stringify(c.args) },
            })),
          },
          ...read.calls.map((c, i) => ({
            role: "tool",
            tool_call_id: id(c, i),
            content: JSON.stringify(read.results[i] ?? null),
          })),
        ]
      : [];
    const res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: PRICE.model,
        // Choosing a tool and drafting need no reasoning trace; thinking costs more and is slower.
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
          ...reading,
        ],
        ...(tools.length ? { tools: tools.map((t) => ({ type: "function", function: t })) } : {}),
        ...(read ? { tool_choice: "none" } : {}),
      }),
    });
    if (!res.ok) throw new Error(`The model service answered ${res.status}.`);
    const reply = (await res.json()) as Reply;
    const m = reply.choices?.[0]?.message;
    if (!m) throw new Error("The model service sent no answer.");
    const u = reply.usage;
    const usage = u && {
      cacheHit: u.prompt_cache_hit_tokens ?? 0,
      cacheMiss: u.prompt_cache_miss_tokens ?? 0,
      output: u.completion_tokens ?? 0,
    };
    const calls = (m.tool_calls ?? []).map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      name: c.function.name,
      args: args(c.function.arguments),
    }));
    // The call is billed whatever its reply holds, so a failure here still carries the usage.
    if (calls.some((c) => !c.args))
      throw new BilledError("The model sent tool arguments that are not JSON.", usage);
    return {
      text: m.content ?? "",
      calls: calls as ToolCall[],
      ...(usage && { usage }),
    };
  };
