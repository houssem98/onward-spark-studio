import { createFileRoute } from "@tanstack/react-router";

import { serviceClient } from "@/lib/service.server";
import { handleSources, supabaseRuns } from "@/lib/source-runs.server";

// Each live source's last success and freshness, for the shell's source-health page.
export const Route = createFileRoute("/api/sources")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const client = serviceClient();
        return handleSources(request, {
          store: client ? supabaseRuns(client) : null,
          now: () => new Date(),
        });
      },
    },
  },
});
