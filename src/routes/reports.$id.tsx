import { useSuspenseQuery } from "@tanstack/react-query";
import { Stagger } from "@/components/motion";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { EvidenceBadge, Notice, PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { exportNotice } from "@/lib/calc";
import { buildReport, reportHtml, reportMarkdown } from "@/lib/report";
import { exportFile } from "@/repo/export";
import { financeQuery, investigationsQuery } from "@/repo/queries";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/reports/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    const [{ reports }] = await Promise.all([
      queryClient.ensureQueryData(investigationsQuery),
      queryClient.ensureQueryData(financeQuery),
    ]);
    if (!reports.some((r) => r.id === params.id)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: `Report ${params.id} — BankIntelli` }],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const report = useSuspenseQuery(investigationsQuery).data.reports.find((r) => r.id === id)!;
  const finance = useSuspenseQuery(financeQuery).data;
  const inv = useStore((s) => s.investigations.find((i) => i.id === report.investigation));
  const actions = useStore((s) => s.actions);
  const issues = useStore((s) => s.issues);
  const audit = useStore((s) => s.audit);

  if (!inv)
    return (
      <Notice tone="warning">
        Report {id} names investigation {report.investigation}, which is not in this data.
      </Notice>
    );
  // No review flow exists yet (L5 T5), so no report carries a sign-off.
  const doc = buildReport({ report, inv, finance, issues, actions, audit, notice: exportNotice() });

  return (
    <Stagger className="space-y-section">
      <PageHeader
        title={doc.title}
        description={doc.header[0]!}
        crumbs={[{ label: "Investigations & Reports", to: "/investigations" }, { label: id }]}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <EvidenceBadge state={doc.state} />
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label="Download HTML"
              onClick={() =>
                exportFile(`${id}.html`, reportHtml(doc), "text/html", "HTML report downloaded")
              }
            >
              <Download className="h-3.5 w-3.5" /> HTML
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label="Download Markdown"
              onClick={() =>
                exportFile(
                  `${id}.md`,
                  reportMarkdown(doc),
                  "text/markdown",
                  "Markdown report downloaded",
                )
              }
            >
              <Download className="h-3.5 w-3.5" /> Markdown
            </Button>
          </div>
        }
      />
      <Notice tone={doc.verified ? "info" : "warning"}>
        {doc.header.slice(1).join(" ")}{" "}
        <Link to="/investigations/$id" params={{ id: inv.id }} className="underline">
          Open {inv.id}
        </Link>
      </Notice>
      {doc.sections.map((s) => (
        <Panel key={s.title} title={s.title}>
          <ul className="space-y-1 text-sm">
            {s.lines.map((l, n) => (
              <li key={n}>{l}</li>
            ))}
          </ul>
        </Panel>
      ))}
    </Stagger>
  );
}
