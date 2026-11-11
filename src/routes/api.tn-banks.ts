import { createFileRoute } from "@tanstack/react-router";

import { serviceClient } from "@/lib/service.server";
import { supabaseRuns } from "@/lib/source-runs.server";
import { readSector } from "@/lib/tn-connector.server";

// Reads the live sites on each call, so the page calls it only when the user asks (L6 T3b).
export const Route = createFileRoute("/api/tn-banks")({
  server: {
    handlers: {
      GET: async () => {
        const client = serviceClient();
        const banks = await readSector(client ? { record: supabaseRuns(client).record } : {});
        return Response.json({ banks });
      },
    },
  },
});
