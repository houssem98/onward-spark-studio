import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useStep } from "@/hooks/use-step";
import { Stagger } from "@/components/motion";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Download, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { EvidenceBadge, Notice, PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { exportNotice } from "@/lib/calc";
import { buildReport, reportHtml, reportMarkdown, type ReportSnapshot } from "@/lib/report";
import type { Review } from "@/lib/review";
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
  const all = useSuspenseQuery(reportsQuery).data;
  const versions = all.versions.filter((x) => x.report === id);
  const inv = useStore((s) => s.investigations.find((i) => i.id === report.investigation));
  const actions = useStore((s) => s.actions);
  const issues = useStore((s) => s.issues);
  const audit = useStore((s) => s.audit);
  // Saved is said only once the version is stored; a failure says why and can be retried.
  const saving = useStep(
    (snapshot: ReportSnapshot) => repo.reports.save(id, snapshot),
    async (saved) => {
      // The save is audited, and the next version freezes that trail, so every read refreshes.
      await queryClient.invalidateQueries();
      toast.success(`Version ${saved.version} saved`);
      void navigate({ search: { v: saved.version } });
    },
  );

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

  const live: ReportSnapshot = { report, inv, finance, issues, actions, audit };
  const review =
    version && all.reviews.find((r) => r.report === id && r.version === version.version);
  // A version's approval is its sign-off; the live report is never signed off.
  const approved = review?.decision?.decision === "Approved" ? review.decision : undefined;
  const doc = buildReport({
    ...(version?.snapshot ?? live),
    notice: exportNotice(),
    ...(approved ? { signoff: { by: approved.by, at: approved.at } } : {}),
  });
  const file = version ? `${id}-v${version.version}` : id;

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
              <Button
                size="sm"
                onClick={() => void saving.run(live)}
                disabled={saving.status === "running"}
              >
                <Save className="h-3.5 w-3.5" />{" "}
                {saving.status === "running" ? "Saving…" : "Save version"}
              </Button>
            )}
            {saving.status === "error" && (
              <span role="alert" className="text-xs text-warning">
                Not saved: {saving.error}{" "}
                <Button size="sm" variant="outline" onClick={() => void saving.retry()}>
                  Retry
                </Button>
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void repo.audit.log("Reports", file, "Printed", `${file} printed`);
                window.print();
              }}
            >
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
      {version && (
        <ReviewPanel
          key={version.version}
          id={id}
          version={version.version}
          review={review}
          reviewers={all.reviewers}
        />
      )}
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

function ReviewPanel({
  id,
  version,
  review,
  reviewers,
}: {
  id: string;
  version: number;
  review: Review | undefined;
  reviewers: string[];
}) {
  const queryClient = useQueryClient();
  const user = useStore((s) => s.user);
  const choices = reviewers.filter((r) => r !== user.name);
  const [reviewer, setReviewer] = useState(choices[0] ?? "");
  const [note, setNote] = useState("");
  const [refused, setRefused] = useState("");
  // Every step goes through the repository, which refuses what separation of duties forbids.
  const run = async (step: () => Promise<void>, done: string) => {
    try {
      await step();
      setRefused("");
      setNote("");
      await queryClient.invalidateQueries();
      toast.success(done);
    } catch (e) {
      setRefused((e as Error).message);
    }
  };

  return (
    <Panel title="Review" className="no-print">
      <div className="space-y-3 text-sm">
        {!review ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>Not submitted.</span>
            <label>
              Reviewer{" "}
              <select
                className="ml-1 h-8 rounded-md border bg-card px-2"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
              >
                {choices.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              onClick={() =>
                run(() => repo.reports.submit(id, version, reviewer), "Submitted for review")
              }
            >
              Submit for review
            </Button>
          </div>
        ) : (
          <>
            <p>
              Submitted by {review.submittedBy} for review by {review.reviewer} on {review.at}.
            </p>
            {review.comments.length > 0 && (
              <ul className="list-disc space-y-1 pl-4">
                {review.comments.map((c, n) => (
                  <li key={n}>
                    {c.by}, {c.at}: {c.text}
                  </li>
                ))}
              </ul>
            )}
            {review.decision ? (
              <p>
                {review.decision.decision} by {review.decision.by} on {review.decision.at}
                {review.decision.comment ? `: ${review.decision.comment}` : "."}
                {review.decision.decision === "Rejected" &&
                  " Rework it as a new version: save the live report and submit that version."}
              </p>
            ) : (
              <div className="space-y-2">
                <Textarea
                  aria-label="Review comment"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Comment; a rejection needs one"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      run(() => repo.reports.comment(id, version, note), "Comment added")
                    }
                  >
                    Comment
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      run(() => repo.reports.decide(id, version, "Approved", note), "Approved")
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      run(() => repo.reports.decide(id, version, "Rejected", note), "Rejected")
                    }
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {refused && (
          <p role="alert" className="text-xs text-warning">
            Refused: {refused}
          </p>
        )}
      </div>
    </Panel>
  );
}
