import { createFileRoute, Link } from "@tanstack/react-router";
import { Notice, PageHeader } from "@/components/kit";
import { REPORTS } from "@/data/investigations";

export const Route = createFileRoute("/reports/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Report ${params.id} — BankIntelli` }],
  }),
  component: ReportPlaceholder,
});

function ReportPlaceholder() {
  const { id } = Route.useParams();
  const report = REPORTS.find((r) => r.id === id);

  return (
    <div className="space-y-5">
      <PageHeader
        title={report?.title ?? `Report ${id}`}
        description={
          report
            ? `${report.id} · ${report.period} · ${report.status}`
            : `No report has the id ${id}.`
        }
        crumbs={[{ label: "Investigations & Reports", to: "/investigations" }, { label: id }]}
      />
      <Notice tone="warning">
        Report preview not built yet. The full report, with its sections, evidence and reviewer
        sign-off, is not available in this proof of concept.
      </Notice>
      <Link to="/investigations" className="text-sm text-primary hover:underline">
        Back to investigations and reports
      </Link>
    </div>
  );
}
