import { createFileRoute } from "@tanstack/react-router";

import { deepseek } from "@/lib/deepseek.server";
import { ask, type Domain } from "@/lib/model";
import { repo } from "@/repo/queries";

const DOMAINS: Domain[] = ["performance", "models", "data"];
const refuse = (refused: string, status: number) => Response.json({ refused }, { status });

// The model's only door. The user and their role come from the server's session, never the body.
export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
          return refuse("Cross-site request.", 403);
        const body = (await request.json().catch(() => null)) as {
          question?: unknown;
          domain?: unknown;
        } | null;
        if (typeof body?.question !== "string" || !DOMAINS.includes(body.domain as Domain))
          return refuse("Send a question and a domain.", 400);
        const key = process.env["DEEPSEEK_API_KEY"];
        if (!key) return refuse("The model is not configured.", 503);
        const user = await repo.session.read().then(
          (s) => s.user,
          () => null,
        );
        if (!user) return refuse("Not signed in.", 401);
        try {
          return Response.json(
            await ask(
              { question: body.question, domain: body.domain as Domain },
              { user, repo, model: deepseek(key) },
            ),
          );
        } catch (e) {
          return refuse(e instanceof Error ? e.message : "The model failed.", 502);
        }
      },
    },
  },
});
