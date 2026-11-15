import { useQuery } from "@tanstack/react-query";

import { SPEND_ROLES } from "@/lib/model";

type Spend = { monthUsd?: number; alert?: string | null; untracked?: string; refused?: string };

const usd = (v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`;

/** The month's model spend and the $5 alert, read from the server for the roles it shows them to. */
export function ModelSpend({ role }: { role: string }) {
  const allowed = SPEND_ROLES.includes(role);
  const spend = useQuery({
    queryKey: ["model-spend"],
    queryFn: async (): Promise<Spend> => (await fetch("/api/ask")).json(),
    enabled: allowed,
    retry: false,
  });
  if (!allowed) return null;
  const d = spend.data;
  return (
    <div className="mt-2 space-y-1.5 text-xs">
      <p className="text-muted-foreground">
        {spend.isPending
          ? "Reading model spend…"
          : spend.isError
            ? `Model spend could not be read: ${spend.error.message}`
            : d?.monthUsd !== undefined
              ? `Model spend this month: ${usd(d.monthUsd)}`
              : (d?.untracked ?? d?.refused ?? "Model spend could not be read.")}
      </p>
      {d?.alert && (
        <p role="alert" className="rounded-md bg-warning/10 px-3 py-2 text-warning">
          {d.alert}
        </p>
      )}
    </div>
  );
}
