import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Stagger } from "@/components/motion";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Download, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { EvidenceBadge, Notice, PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { exportNotice } from "@/lib/calc";
import { buildReport, reportHtml, reportMarkdown, type ReportSnapshot } from "@/lib/report";
import { exportFile } from "@/repo/export";
import { financeQuery, investigationsQuery, repo, reportsQuery } from "@/repo/queries";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/reports/$id")({
  // A saved version is opened by its number, so a link reopens exactly what was saved.
  validateSearch: (s: Record<string, unknown>): { v?: number } => {
    const v = s["v"];
    return typeof v === "number" && Number.isInteger(v) && v > 0 ? { v } : {};
  },
  loader: async ({ params, context: { queryClient } }) => {
    const [{ reports }] = await Promise.all([
      queryClient.ensureQueryData(investigationsQuery),
      queryClient.ensureQueryData(financeQuery),
      queryClient.ensureQueryData(reportsQuery),
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
  const { v } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const report = useSuspenseQuery(investigationsQuery).data.reports.find((r) => r.id === id)!;
  const finance = useSuspenseQuery(financeQuery).data;
  const versions = useSuspenseQuery(reportsQuery).data.versions.filter((x) => x.report === id);
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
  const version = v === undefined ? undefined : versions.find((x) => x.version === v);
  const crumbs = [{ label: "Investigations & Reports", to: "/investigations" }, { label: id }];
  if (v !== undefined && !version)
    return (
      <Stagger className="space-y-section">
        <PageHeader title={report.title} crumbs={crumbs} />
        <Notice tone="warning">
          Version {v} of {id} does not exist.{" "}
          <Link to="/reports/$id" params={{ id }} className="underline">
            Open the live report
          </Link>
        </Notice>
      </Stagger>
    );

  // No review flow exists yet (L5 T5), so no report carries a sign-off.
  const live: ReportSnapshot = { report, inv, finance, issues, actions, audit };
  const doc = buildReport({ ...(version?.snapshot ?? live), notice: exportNotice() });
  const file = version ? `${id}-v${version.version}` : id;
  const save = async () => {
    const saved = await repo.reports.save(id, live);
    await queryClient.invalidateQueries({ queryKey: reportsQuery.queryKey });
    toast.success(`Version ${saved.version} saved`);
    void navigate({ search: { v: saved.version } });
  };

  return (
    <Stagger className="space-y-section">
      <PageHeader
        title={doc.title}
        description={doc.header[0]!}
        crumbs={crumbs}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <EvidenceBadge state={doc.state} />
            {!version && (
              <Button size="sm" onClick={save}>
                <Save className="h-3.5 w-3.5" /> Save version
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label="Download HTML"
              onClick={() =>
                exportFile(`${file}.html`, reportHtml(doc), "text/html", "HTML report downloaded")
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
                  `${file}.md`,
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
      <Notice tone={version ? "info" : "warning"}>
        {version ? (
          <>
            Version {version.version}, saved {version.savedAt} by {version.savedBy}. Its figures
            come from the evidence saved with it, not from today&apos;s data.{" "}
            <Link to="/reports/$id" params={{ id }} className="underline">
              Open the live report
            </Link>
          </>
        ) : (
          "Live report, not saved: its figures follow today's data until a version is saved."
        )}
      </Notice>
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
      <Panel title="Saved versions" className="no-print">
        {versions.length ? (
          <ul className="space-y-1 text-sm">
            {versions.map((x) => (
              <li key={x.version}>
                <Link
                  to="/reports/$id"
                  params={{ id }}
                  search={{ v: x.version }}
                  className="text-primary underline"
                >
                  Version {x.version}
                </Link>{" "}
                · saved {x.savedAt} by {x.savedBy}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No saved version yet.</p>
        )}
      </Panel>
    </Stagger>
  );
}
