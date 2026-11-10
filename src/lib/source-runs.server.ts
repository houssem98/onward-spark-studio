import { healthOf, type Latest } from "@/lib/sources";

// Each connector run, kept in the Supabase table the human chose (L6 T3) so a source's last success
// survives restarts. Only the server writes it, with the service-role key.

export interface SourceRun {
  source: string;
  at: string;
  ok: boolean;
  detail: string;
}
export interface RunStore {
  record(run: SourceRun): Promise<void>;
  latest(): Promise<Record<string, Latest>>;
}

interface Client {
  from(table: "source_runs"): {
    insert(row: SourceRun): PromiseLike<{ error: unknown }>;
    select(columns: string): {
      order(
        column: "at",
        opts: { ascending: false },
      ): {
        limit(n: number): PromiseLike<{ data: SourceRun[] | null; error: unknown }>;
      };
    };
  };
}

export const supabaseRuns = (client: Client): RunStore => ({
  record: async (run) => {
    const { error } = await client.from("source_runs").insert(run);
    if (error) throw error;
  },
  latest: async () => {
    const { data, error } = await client
      .from("source_runs")
      .select("source, at, ok, detail")
      .order("at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const out: Record<string, Latest> = {};
    for (const r of data ?? []) {
      const l = (out[r.source] ??= {});
      if (r.ok) l.lastSuccess ??= r.at;
      else if (!l.lastSuccess) l.lastFailure ??= { at: r.at, detail: r.detail };
    }
    return out;
  },
});

export async function handleSources(
  _request: Request,
  deps: { store: RunStore | null; now: () => Date },
) {
  if (!deps.store)
    return Response.json({
      untracked:
        "Source health is not tracked: the source_runs table or the server's service key is not configured.",
    });
  return Response.json({ sources: healthOf(await deps.store.latest(), deps.now()) });
}
