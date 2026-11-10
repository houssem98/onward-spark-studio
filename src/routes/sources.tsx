import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DataTable, type Column } from "@/components/DataTable";
import { Notice, PageHeader } from "@/components/kit";
import { Stagger } from "@/components/motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: "Source Health — BankIntelli" },
      {
        name: "description",
        content: "Each live data source's last successful read and whether its data is fresh.",
      },
    ],
  }),
  component: SourcesPage,
});

interface Health {
  id: string;
  name: string;
  status: string;
  lastSuccess: string | null;
  lastFailure?: { at: string; detail: string } | null;
}

const when = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 16).replace("T", " ") + " UTC" : "—";

function SourcesPage() {
  const q = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const res = await fetch("/api/sources");
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      return (await res.json()) as { sources?: Health[]; untracked?: string };
    },
    retry: false,
  });
  const cols: Column<Health>[] = [
    { key: "name", header: "Source" },
    { key: "lastSuccess", header: "Last success", cell: (s) => when(s.lastSuccess) },
    { key: "status", header: "Status" },
    {
      key: "lastFailure",
      header: "Last failure since then",
      cell: (s) => (s.lastFailure ? `${when(s.lastFailure.at)}: ${s.lastFailure.detail}` : "—"),
    },
  ];
  return (
    <Stagger className="space-y-section">
      <PageHeader
        title="Source Health"
        description="Each live source's last successful read. A source is stale a quarter and a week after its last success, and stale figures are downgraded by the evidence policy."
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={q.isFetching}
            onClick={() => void q.refetch()}
          >
            {q.isFetching ? "Checking…" : "Check again"}
          </Button>
        }
      />
      {q.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Reading source health…
        </p>
      ) : q.isError ? (
        <Notice tone="warning">Source health could not be read: {q.error.message}</Notice>
      ) : q.data.untracked ? (
        <Notice>{q.data.untracked}</Notice>
      ) : (
        <DataTable rows={q.data.sources ?? []} columns={cols} rowKey={(s) => s.id} />
      )}
    </Stagger>
  );
}
