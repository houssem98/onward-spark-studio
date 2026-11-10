// The month's model spend, kept in the Supabase table the human chose (L7 T2b) so it survives
// restarts. The server writes with the service-role key; no client may read or write the table.

export interface ModelCall {
  at: string;
  actor: string;
  model: string;
  usd: number;
}
export interface SpendStore {
  record(call: ModelCall): Promise<void>;
  month(now: Date): Promise<number>;
}

interface Client {
  from(table: "model_calls"): {
    insert(row: ModelCall): PromiseLike<{ error: unknown }>;
    select(columns: "usd"): {
      gte(
        column: "at",
        value: string,
      ): PromiseLike<{ data: { usd: number }[] | null; error: unknown }>;
    };
  };
}

const monthStart = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

export const supabaseSpend = (client: Client): SpendStore => ({
  record: async (call) => {
    const { error } = await client.from("model_calls").insert(call);
    if (error) throw error;
  },
  month: async (now) => {
    const { data, error } = await client
      .from("model_calls")
      .select("usd")
      .gte("at", monthStart(now));
    if (error) throw error;
    return (data ?? []).reduce((t, r) => t + Number(r.usd), 0);
  },
});
