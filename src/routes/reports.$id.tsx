import { useSuspenseQuery } from "@tanstack/react-query";
import { Stagger } from "@/components/motion";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Notice, PageHeader } from "@/components/kit";
import { investigationsQuery } from "@/repo/queries";

export const Route = createFileRoute("/reports/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    const { reports } = await queryClient.ensureQueryData(investigationsQuery);
    if (!reports.some((r) => r.id === params.id)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: `Report ${params.id} — BankIntelli` }],
  }),
  component: ReportPlaceholder,
});

function ReportPlaceholder() {
  const { id } = Route.useParams();
  const report = useSuspenseQuery(investigationsQuery).data.reports.find((r) => r.id === id)!;

  return (
    <Stagger className="space-y-section">
      <PageHeader
        title={report.title}
        description={`${report.id} · ${report.period} · ${report.status}`}
        crumbs={[{ label: "Investigations & Reports", to: "/investigations" }, { label: id }]}
      />
      <Notice tone="warning">
        Report preview not built yet. The full report, with its sections, evidence and reviewer
        sign-off, is not available in this proof of concept.
      </Notice>
      <Link to="/investigations" className="text-sm text-primary hover:underline">
        Back to investigations and reports
      </Link>
    </Stagger>
  );
}
