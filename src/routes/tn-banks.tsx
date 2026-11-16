import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { DataTable, type Column } from "@/components/DataTable";
import { Notice, PageHeader } from "@/components/kit";
import { Stagger } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { useStep } from "@/hooks/use-step";
import type { readSector } from "@/lib/tn-connector.server";
import type { Indicator } from "@/lib/tn-filings";
import { openSectorInvestigation } from "@/lib/tn-investigation";
import { repo } from "@/repo/queries";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/tn-banks")({
  head: () => ({
    meta: [
      { title: "Tunisian Banks — BankIntelli" },
      {
        name: "description",
        content:
          "The latest quarter filed by each bank listed on the Bourse de Tunis, in USD at the BCT's rate.",
      },
    ],
  }),
  component: TnBanksPage,
});

type Bank = Awaited<ReturnType<typeof readSector>>[number];
type Read = Extract<Bank, { state: "ok" }>;

const FIGURES: [Indicator, string][] = [
  ["net_banking_income", "Net banking income"],
  ["net_loans", "Net loans"],
  ["customer_deposits", "Deposits"],
  ["bank_equity", "Equity"],
];

// The state's name in sentence case, as the evidence badge writes it.
const stateLabel = (s: string) => s[0] + s.slice(1).toLowerCase().replace(/_/g, " ");

function TnBanksPage() {
  const q = useQuery({
    queryKey: ["tn-banks"],
    queryFn: async () => {
      const res = await fetch("/api/tn-banks");
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      return (await res.json()) as { banks: Bank[] };
    },
    enabled: false,
    retry: false,
  });
  const banks = q.data?.banks ?? [];
  const read = banks.filter((b): b is Read => b.state === "ok");
  const owner = useStore((s) => s.user.name);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Real filings become a stored investigation only in production: the demo labels every record it
  // keeps synthetic, which these are not.
  const opening = useStep(
    () => openSectorInvestigation(repo, banks, owner),
    async (id) => {
      // The report page reads the investigations list from the cache, which this page does not
      // keep active, so every query is fetched again before opening it.
      await queryClient.invalidateQueries({ refetchType: "all" });
      void navigate({ to: "/reports/$id", params: { id } });
    },
  );
  const canOpen = repo.environment === "production" && read.length > 0;
  const failed = banks.filter((b): b is Exclude<Bank, Read> => b.state !== "ok");
  const fx = (b: Read) => b.figures.net_banking_income.fx;
  const cols: Column<Read>[] = [
    { key: "bank", header: "Bank" },
    { key: "periodEnd", header: "Period end" },
    ...FIGURES.map(([id, label]): Column<Read> => ({
      key: id,
      header: `${label}, USD M`,
      cell: (b) => (
        <span className="whitespace-nowrap">
          {b.figures[id].value.toFixed(1)}{" "}
          <span className="text-muted-foreground" title={b.figures[id].reasons?.join(" ")}>
            · {stateLabel(b.figures[id].state)}
          </span>
        </span>
      ),
    })),
    {
      key: "fx",
      header: "TND per USD",
      cell: (b) => <span title={fx(b).source}>{`${fx(b).tndPerUsd} on ${fx(b).date}`}</span>,
    },
    {
      key: "source",
      header: "Filing",
      cell: (b) => (
        <a href={b.source} target="_blank" rel="noreferrer" className="underline">
          {b.bank} filing
        </a>
      ),
    },
  ];
  return (
    <Stagger className="space-y-section">
      <PageHeader
        title="Tunisian Banks"
        meta="Real public filings · testing and education"
        tag={false}
        description="The latest quarter each bank listed on the Bourse de Tunis has filed, converted to USD at the BCT's dollar rate for its period end. The evidence policy sets each figure's state from the filing and its date."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={q.isFetching}
              onClick={() => void q.refetch()}
            >
              {q.isFetching ? "Reading…" : "Read the latest filings"}
            </Button>
            {canOpen && (
              <Button
                size="sm"
                disabled={opening.status === "running"}
                onClick={() => void opening.run()}
              >
                {opening.status === "running" ? "Opening…" : "Open as an investigation"}
              </Button>
            )}
            {opening.status === "error" && (
              <span role="alert" className="text-xs text-warning">
                Not opened: {opening.error}
              </span>
            )}
          </div>
        }
      />
      {q.isFetching ? (
        <p role="status" className="text-sm text-muted-foreground">
          Reading each bank's statement and the BCT's rate…
        </p>
      ) : q.isError ? (
        <Notice tone="warning">The filings could not be read: {q.error.message}</Notice>
      ) : !q.data ? (
        <Notice>
          Nothing has been read yet. Reading fetches each bank's latest statement from the Bourse de
          Tunis and the BCT's dollar rate, and can take a minute.
        </Notice>
      ) : (
        <>
          <DataTable rows={read} columns={cols} rowKey={(b) => b.company} />
          {failed.length > 0 && (
            <Notice tone="warning">
              Not read:
              <ul>
                {failed.map((b) => (
                  <li key={b.company}>
                    {b.bank}: {b.detail}
                  </li>
                ))}
              </ul>
            </Notice>
          )}
        </>
      )}
    </Stagger>
  );
}
