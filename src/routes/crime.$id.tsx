import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { CASES, INVESTIGATORS_LIST, type AlertStatus } from "@/data/crime";
import { EvidenceBadge, Field, Notice, PageHeader, Panel, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { actions, useStore } from "@/store/app-store";
import { downloadFile } from "@/lib/calc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crime/$id")({
  loader: ({ params }) => {
    if (!CASES.some((c) => c.id === params.id)) throw notFound();
    return { id: params.id };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Case ${params.id} — BankIntelli` },
      {
        name: "description",
        content: "Financial crime case workspace with timeline, evidence and workflow.",
      },
      { property: "og:title", content: `Case ${params.id} — BankIntelli` },
      {
        property: "og:description",
        content: "Financial crime case workspace with timeline, evidence and workflow.",
      },
    ],
  }),
  component: CasePage,
});

const FLOW: AlertStatus[] = ["New", "Triage", "Investigation", "Review"];

function CasePage() {
  const { id } = Route.useParams();
  const c = useStore((s) => s.cases.find((x) => x.id === id))!;
  const audit = useStore((s) => s.audit.filter((a) => a.entity === id));
  const [note, setNote] = useState("");
  const [role, setRole] = useState<"Investigator" | "Reviewer">("Investigator");
  const [pending, setPending] = useState<AlertStatus | null>(null);

  const exportSummary = () => {
    const md = `# Sanitized case summary — ${c.id}\n\n_Fictional synthetic data. Customer identifiers are pseudonymous._\n\n- Type: ${c.type}\n- Status: ${c.status}\n- Priority: ${c.priority}\n- Assignee: ${c.assignee}\n\n## Summary\n${c.summary}\n\n## Evidence\n${c.evidence.map((e) => `- ${e.label}: ${e.state} (${e.source})`).join("\n")}\n\n## Timeline\n${c.timeline.map((t) => `- ${t.at} ${t.event}`).join("\n")}\n`;
    downloadFile(`${c.id}-summary.md`, md, "text/markdown");
    toast.success("Sanitized summary exported");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: "Financial Crime", to: "/crime" }, { label: c.id }]}
        title={c.title}
        description={c.summary}
        actions={
          <Button size="sm" variant="outline" onClick={exportSummary}>
            <Download className="h-3.5 w-3.5" /> Sanitized summary
          </Button>
        }
      />

      <Panel
        title="Workflow"
        actions={
          <div className="flex gap-1.5">
            <StatusBadge value={c.priority} />
            <StatusBadge value={c.status} />
          </div>
        }
      >
        <ol className="flex flex-wrap items-center gap-1 text-xs">
          {[...FLOW, "Closed / Escalated"].map((s, i) => {
            const idx = FLOW.indexOf(c.status);
            const done = c.status === "Closed" || c.status === "Escalated" ? true : i < idx;
            const cur =
              s === c.status || (i === 4 && (c.status === "Closed" || c.status === "Escalated"));
            return (
              <li
                key={s}
                className={cn(
                  "rounded border px-2.5 py-1",
                  cur
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-success/30 bg-success/10 text-success"
                      : "text-muted-foreground",
                )}
              >
                {i + 1}. {s}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["Triage", "Investigation", "Review", "Closed", "Escalated"] as AlertStatus[]).map(
            (s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "Escalated" ? "destructive" : "outline"}
                disabled={c.status === s}
                onClick={() => setPending(s)}
              >
                {s === "Closed" ? "Close case" : s === "Escalated" ? "Escalate" : `Move to ${s}`}
              </Button>
            ),
          )}
          <select
            aria-label="Assignee"
            className="ml-auto h-8 rounded-md border bg-card px-2 text-sm"
            value={c.assignee}
            onChange={(e) =>
              actions.updateCase(id, { assignee: e.target.value }, `Assigned to ${e.target.value}`)
            }
          >
            {INVESTIGATORS_LIST.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Supporting transactions" className="xl:col-span-2" bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-caption uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Txn</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Dir</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Counterparty</th>
                  <th className="px-3 py-2">Flag</th>
                </tr>
              </thead>
              <tbody>
                {c.transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="num px-3 py-2 text-xs">{t.id}</td>
                    <td className="num px-3 py-2 text-xs">{t.date}</td>
                    <td className="px-3 py-2">{t.direction}</td>
                    <td className="num px-3 py-2 text-right">
                      {t.amount.toLocaleString()} {t.currency}
                    </td>
                    <td className="px-3 py-2">{t.counterparty}</td>
                    <td className="px-3 py-2">
                      {t.flag && <StatusBadge value={t.flag} tone="warning" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Alert & entities">
          <dl className="space-y-3">
            <Field label="Linked alerts">{c.alerts.join(", ")}</Field>
            <Field label="Customer">
              {c.customer} · risk {c.customerRisk}
            </Field>
            <Field label="SLA due">
              <span className="num">{c.slaDue}</span>
            </Field>
          </dl>
          <p className="eyebrow mt-3 mb-1">Related entities</p>
          <ul className="space-y-1 text-sm">
            {c.entities.map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span>
                  {e.name}
                  <span className="block text-xs text-muted-foreground">{e.relation}</span>
                </span>
                <StatusBadge value={e.risk} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Evidence register">
          <ul className="space-y-2 text-sm">
            {c.evidence.map((e) => (
              <li key={e.id}>
                <div className="flex justify-between gap-2">
                  <span>{e.label}</span>
                  <EvidenceBadge state={e.state} />
                </div>
                <p className="text-xs text-muted-foreground">{e.source}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Notes">
          <ul className="mb-3 space-y-2 text-sm">
            {c.notes.length === 0 ? (
              <li className="text-muted-foreground">No notes yet.</li>
            ) : (
              c.notes.map((n, i) => (
                <li key={i} className="rounded border p-2">
                  <div className="text-xs text-muted-foreground">
                    {n.role} · {n.author} · {n.at}
                  </div>
                  {n.text}
                </li>
              ))
            )}
          </ul>
          <select
            aria-label="Note role"
            className="mb-2 h-8 rounded-md border bg-card px-2 text-xs"
            value={role}
            onChange={(e) => setRole(e.target.value as "Reviewer")}
          >
            <option>Investigator</option>
            <option>Reviewer</option>
          </select>
          <Textarea
            aria-label="Case note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
          />
          <Button
            size="sm"
            className="mt-2"
            disabled={!note.trim()}
            onClick={() => {
              actions.addCaseNote(id, note, role);
              setNote("");
            }}
          >
            Add note
          </Button>
        </Panel>
        <Panel title="Timeline & audit">
          <ol className="space-y-2 border-l pl-3 text-xs">
            {[...c.timeline].reverse().map((t, i) => (
              <li key={i}>
                <span className="num text-muted-foreground">{t.at}</span>
                <div>{t.event}</div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            {audit.length} audit events recorded for this case.
          </p>
        </Panel>
      </div>
      <Notice>
        Use “suspicious activity indicator” language until review is complete. Escalation in this
        POC does not file any regulatory report.
      </Notice>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm: {pending}</AlertDialogTitle>
            <AlertDialogDescription>
              This simulated action changes the case status and is recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                actions.updateCase(id, { status: pending! }, `Status → ${pending}`);
                toast.success(`Case moved to ${pending}`);
                setPending(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
