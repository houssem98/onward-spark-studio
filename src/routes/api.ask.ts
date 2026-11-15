import { createFileRoute } from "@tanstack/react-router";

import { handleAsk, handleSpend } from "@/lib/ask.server";
import { env, serviceClient } from "@/lib/service.server";
import { supabaseSpend, type SpendClient } from "@/lib/spend.server";
import { repo } from "@/repo/queries";

// Secrets the human sets on the server; none is ever in the client bundle.
const store = () => {
  const client = serviceClient();
  // The real client has every method SpendClient names, but TypeScript gives up comparing its
  // generic filter overloads (TS2589), so the fit is stated here and exercised by the fakes in tests.
  return client ? supabaseSpend(client as unknown as SpendClient) : null;
};
const now = () => new Date();

export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleAsk(request, { key: env("DEEPSEEK_API_KEY"), repo, store: store(), now }),
      GET: ({ request }) => handleSpend(request, { repo, store: store(), now }),
    },
  },
});
