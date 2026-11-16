import type { Domain } from "@/lib/model";
import { repo } from "@/repo/queries";
import { authHeaders } from "@/repo/supabase";

// The copilot panel's way to the model (L7 T10): /api/ask on the server, which holds the key.

/** The domain a question is asked in, which decides the tools the model is offered. */
export const domainOf = (q: string): Domain =>
  /\bmodels?\b|scorecard|validation/i.test(q)
    ? "models"
    : /\bdata ?sets?\b|certif|lineage/i.test(q)
      ? "data"
      : "performance";

export type ModelReply = { text: string; withheld?: string; tools: string[] } | { note: string };

/** The model's draft for a question, or a note saying why there is none; it never throws. */
export async function askModel(question: string): Promise<ModelReply> {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // In production the server knows the caller only by the session token sent with it.
        ...(repo.environment === "production" ? await authHeaders() : {}),
      },
      body: JSON.stringify({ question, domain: domainOf(question) }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      text?: string;
      withheld?: string;
      refused?: string;
      results?: { name: string }[];
    };
    if (res.status === 503)
      return { note: "No model is connected here; the answer below comes from the routing." };
    if (body.refused || !res.ok)
      return {
        note: `The model did not answer: ${body.refused ?? `the server answered ${res.status}`}.`,
      };
    return {
      text: body.text ?? "",
      ...(body.withheld ? { withheld: body.withheld } : {}),
      tools: (body.results ?? []).map((r) => r.name),
    };
  } catch (e) {
    return {
      note: `The model could not be reached: ${e instanceof Error ? e.message : String(e)}.`,
    };
  }
}
