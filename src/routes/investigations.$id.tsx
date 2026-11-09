import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Stagger } from "@/components/motion";
import { useState } from "react";
import { toast } from "sonner";
import { EvidenceBadge, Field, Notice, PageHeader, Panel, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActions, useStore } from "@/store/app-store";
import type { EvidenceState, Finding, InvStatus } from "@/data/investigations";
import { DEMO_DATE } from "@/lib/definitions";
import { assignEvidenceState, findingAssessment } from "@/lib/evidence-policy";
import { investigationsQuery, repo } from "@/repo/queries";

export const Route = createFileRoute("/investigations/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    // fetchQuery, not ensureQueryData: an investigation created since the last read must be found.
    const { investigations } = await queryClient.fetchQuery(investigationsQuery);
    if (!investigations.some((i) => i.id === params.id)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: `Investigation ${params.id} — BankIntelli` },
      {
        name: "description",
        content: "Evidence-backed investigation with findings, verification states and actions.",
      },
      { property: "og:title", content: `Investigation ${params.id} — BankIntelli` },
      {
        property: "og:description",
        content: "Evidence-backed investigation with findings, verification states and actions.",
      },
    ],
  }),
  component: InvDetail,
});

const OWNERS = ["A. Haddad", "G. Rossi", "T. Ibrahim", "K. Mensah", "F. Leclerc", "D. Moreau"];

/** What a finding's state rests on: its sources, what each gives, and the policy's reasons. */
function Evidence({ f, today, hidden }: { f: Finding; today: string; hidden: boolean }) {
  const a = findingAssessment(f, today);
  const given = (id: string) => a.values?.find((v) => v.sourceId === id)?.value;
  return (
    <div
      id={`evidence-${f.id}`}
      role="region"
      aria-label={`Evidence for ${f.id}`}
      hidden={hidden}
      className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs"
    >
      <p>Why this state: {assignEvidenceState(a).reasons.join(" ")}</p>
      {a.claimed !== undefined && <p>Claimed figure: {a.claimed}</p>}
      {a.sources.length ? (
        <ul className="list-disc pl-4">
          {a.sources.map((s) => (
            <li key={s.id}>
              {s.name} · {s.authority.replace("_", " ")} · {s.entity} · {s.period} · as of {s.asOf}{" "}
              · {given(s.id) === undefined ? "gives no value" : `gives ${given(s.id)}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No source is linked.</p>
      )}
      {a.calculation && (
        <p>
          Calculation: states {a.calculation.output}; recomputed{" "}
          {a.calculation.reproduced ?? "it could not be reproduced"}
        </p>
      )}
      {a.reconciles !== undefined && (
        <p>Parts reconcile to the total: {a.reconciles ? "yes" : "no"}</p>
      )}
    </div>
  );
}

function InvDetail() {
  const { id } = Route.useParams();
  const actions = useActions();
  const inv = useStore((s) => s.investigations.find((i) => i.id === id));
  const acts = useStore((s) => s.actions);
  const [form, setForm] = useState<{
    finding: string;
    text: string;
    owner: string;
    due: string;
  } | null>(null);

  const [openEv, setOpenEv] = useState<string | null>(null);

  if (!inv) return null;
  const today = repo.environment === "demo" ? DEMO_DATE : new Date().toISOString().slice(0, 10);
  // A finding's conflict or gap stays on screen, whether or not its evidence is open.
  const why = (states: EvidenceState[]) =>
    inv.findings
      .filter((f) => states.includes(f.state))
      .map((f) => `${f.id}: ${assignEvidenceState(findingAssessment(f, today)).reasons.join(" ")}`);
  const contradictions = [...inv.contradictions, ...why(["CONFLICTING_EVIDENCE"])];
  const limitations = [
    ...inv.limitations,
    ...why(["PARTIALLY_VERIFIED", "UNVERIFIED", "NOT_AVAILABLE"]),
  ];

  return (
    <Stagger className="space-y-section">
      <PageHeader
        crumbs={[{ label: "Investigations & Reports", to: "/investigations" }, { label: inv.id }]}
        title={inv.title}
        description={inv.question}
        actions={
          <>
            <select
              aria-label="Status"
              className="h-8 rounded-md border bg-card px-2 text-sm"
              value={inv.status}
              onChange={(e) => actions.setInvestigationStatus(id, e.target.value as InvStatus)}
            >
              {["Draft", "In Progress", "Pending Review", "Approved", "Closed"].map((s) => (
                <option key={s} disabled={s === "Approved"}>
                  {s}
                </option>
              ))}
            </select>
            {inv.report && (
              <Button size="sm" asChild>
                <Link to="/reports/$id" params={{ id: inv.report }}>
                  Open report
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Panel title="Scope">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Field label="Module">{inv.module}</Field>
          <Field label="Department">{inv.department}</Field>
          <Field label="Owner">{inv.owner}</Field>
          <Field label="Period">{inv.period}</Field>
          <Field label="Priority">
            <StatusBadge value={inv.priority} />
          </Field>
          <Field label="Verification">
            <EvidenceBadge state={inv.state} />
          </Field>
        </dl>
      </Panel>

      <Panel title="Findings" bodyClass="p-0">
        <ul className="divide-y">
          {inv.findings.map((f) => (
            <li key={f.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="max-w-3xl">
                  <span className="num text-xs text-muted-foreground">{f.id}</span>{" "}
                  <StatusBadge
                    value={f.kind}
                    tone={f.kind === "Measured" ? "info" : "neutral"}
                    icon={false}
                  />
                  <button
                    type="button"
                    aria-expanded={openEv === f.id}
                    aria-controls={`evidence-${f.id}`}
                    onClick={() => setOpenEv(openEv === f.id ? null : f.id)}
                    className="mt-1 block text-left font-medium decoration-dotted underline-offset-4 hover:underline"
                  >
                    {f.claim}
                  </button>
                </div>
                <EvidenceBadge state={f.state} />
              </div>
              <Evidence f={f} today={today} hidden={openEv !== f.id} />
              <dl className="grid gap-3 text-xs md:grid-cols-4">
                <Field label="Evidence">{f.evidence}</Field>
                <Field label="Source · period">
                  {f.source} · {f.period}
                </Field>
                <Field label="Method">{f.method}</Field>
                <Field label="Impact">{f.impact ?? "Not measurable"}</Field>
                <Field label="Limitations">{f.limitations}</Field>
                <Field label="Next step">{f.next}</Field>
                <Field label="Actions">
                  {acts
                    .filter((a) => a.finding === f.id)
                    .map((a) => (
                      <span key={a.id} className="mr-1">
                        {a.id} <StatusBadge value={a.status} />
                      </span>
                    ))}
                </Field>
              </dl>
              {form?.finding === f.id ? (
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!form.text.trim()) return;
                    actions.addAction({
                      action: form.text,
                      finding: f.id,
                      owner: form.owner,
                      due: form.due,
                      priority: "Medium",
                      status: "Open",
                      outcome: f.next,
                    });
                    setForm(null);
                    toast.success("Action created");
                  }}
                >
                  <Input
                    className="h-8 max-w-sm"
                    aria-label="Corrective action"
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    placeholder="Action"
                    autoFocus
                  />
                  <select
                    aria-label="Owner"
                    className="h-8 rounded-md border bg-card px-2 text-sm"
                    value={form.owner}
                    onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  >
                    {OWNERS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <Input
                    type="date"
                    aria-label="Due date"
                    className="h-8 w-40"
                    value={form.due}
                    onChange={(e) => setForm({ ...form, due: e.target.value })}
                  />
                  <Button size="sm" type="submit">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setForm(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({ finding: f.id, text: f.next, owner: OWNERS[0]!, due: "2026-02-28" })
                  }
                >
                  Assign corrective action
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Contradictory evidence">
          {contradictions.length ? (
            <ul className="list-disc pl-4 text-sm">
              {contradictions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
        </Panel>
        <Panel title="Limitations">
          {limitations.length ? (
            <ul className="list-disc pl-4 text-sm">
              {limitations.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
        </Panel>
      </div>
      <Notice>
        Narrative, figures and the facts behind each evidence state come from the synthetic demo
        data; the evidence policy sets each state from those facts, and nothing real has been
        checked.
      </Notice>
    </Stagger>
  );
}
