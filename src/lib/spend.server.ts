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
      ): {
        order(column: "id"): {
          range(
            from: number,
            to: number,
          ): PromiseLike<{ data: { usd: number }[] | null; error: unknown }>;
        };
      };
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
  // The server caps each read (1,000 rows by default), so the month is read page by page until a
  // page comes back empty; a page shorter than asked does not prove the end.
  month: async (now) => {
    let total = 0;
    for (let from = 0; ;) {
      const { data, error } = await client
        .from("model_calls")
        .select("usd")
        .gte("at", monthStart(now))
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      if (!data?.length) return total;
      total += data.reduce((t, r) => t + Number(r.usd), 0);
      from += data.length;
    }
  },
});
