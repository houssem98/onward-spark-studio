import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import { handleAsk, handleSpend } from "@/lib/ask.server";
import { supabaseSpend } from "@/lib/spend.server";
import { repo } from "@/repo/queries";

// Secrets the human sets on the server; none is ever in the client bundle.
const env = (name: string) => process.env[name] || undefined;
const store = () => {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return url && key ? supabaseSpend(createClient(url, key)) : null;
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
