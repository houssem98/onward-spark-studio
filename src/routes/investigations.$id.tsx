import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EvidenceBadge, Field, Notice, PageHeader, Panel, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, useStore } from "@/store/app-store";
import type { InvStatus } from "@/data/investigations";

export const Route = createFileRoute("/investigations/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Investigation ${params.id} — BankIntelli` },
      { name: "description", content: "Evidence-backed investigation with findings, verification states and actions." },
      { property: "og:title", content: `Investigation ${params.id} — BankIntelli` },
      { property: "og:description", content: "Evidence-backed investigation with findings, verification states and actions." },
    ],
  }),
  component: InvDetail,
});

const OWNERS = ["A. Haddad", "G. Rossi", "T. Ibrahim", "K. Mensah", "F. Leclerc", "D. Moreau"];

function InvDetail() {
  const { id } = Route.useParams();
  const inv = useStore((s) => s.investigations.find((i) => i.id === id));
  const acts = useStore((s) => s.actions);
  const [form, setForm] = useState<{ finding: string; text: string; owner: string; due: string } | null>(null);

  if (!inv) return <div className="p-8 text-center"><p className="text-sm text-muted-foreground">Investigation {id} not found.</p><Link to="/investigations" className="text-primary">Back to register</Link></div>;

  return (
    <div className="space-y-5">
      <PageHeader crumbs={[{ label: "Investigations", to: "/investigations" }, { label: inv.id }]} title={inv.title} description={inv.question}
        actions={<>
          <select aria-label="Status" className="h-8 rounded-md border bg-card px-2 text-sm" value={inv.status} onChange={(e) => actions.setInvestigationStatus(id, e.target.value as InvStatus)}>
            {["Draft", "In Progress", "Pending Review", "Approved", "Closed"].map((s) => <option key={s}>{s}</option>)}
          </select>
          {inv.report && <Button size="sm" asChild><Link to="/reports/$id" params={{ id: inv.report }}>Open report</Link></Button>}
        </>} />

      <Panel title="Scope">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-6">
          <Field label="Module">{inv.module}</Field><Field label="Department">{inv.department}</Field><Field label="Owner">{inv.owner}</Field>
          <Field label="Period">{inv.period}</Field><Field label="Priority"><StatusBadge value={inv.priority} /></Field><Field label="Verification"><EvidenceBadge state={inv.state} /></Field>
        </dl>
      </Panel>

      <Panel title="Findings" bodyClass="p-0">
        <ul className="divide-y">{inv.findings.map((f) => (
          <li key={f.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="max-w-3xl"><span className="num text-xs text-muted-foreground">{f.id}</span> <StatusBadge value={f.kind} tone={f.kind === "Measured" ? "info" : "neutral"} icon={false} /><p className="mt-1 font-medium">{f.claim}</p></div>
              <EvidenceBadge state={f.state} />
            </div>
            <dl className="grid gap-3 text-xs md:grid-cols-4">
              <Field label="Evidence">{f.evidence}</Field><Field label="Source · period">{f.source} · {f.period}</Field><Field label="Method">{f.method}</Field><Field label="Impact">{f.impact ?? "Not measurable"}</Field>
              <Field label="Limitations">{f.limitations}</Field><Field label="Next step">{f.next}</Field>
              <Field label="Actions">{acts.filter((a) => a.finding === f.id).map((a) => <span key={a.id} className="mr-1">{a.id} <StatusBadge value={a.status} /></span>)}</Field>
            </dl>
            {form?.finding === f.id ? (
              <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!form.text.trim()) return; actions.addAction({ action: form.text, finding: f.id, owner: form.owner, due: form.due, priority: "Medium", status: "Open", outcome: f.next }); setForm(null); toast.success("Action created"); }}>
                <Input className="h-8 max-w-sm" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Action" autoFocus />
                <select aria-label="Owner" className="h-8 rounded-md border bg-card px-2 text-sm" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select>
                <Input type="date" className="h-8 w-40" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
                <Button size="sm" type="submit">Save</Button><Button size="sm" variant="ghost" type="button" onClick={() => setForm(null)}>Cancel</Button>
              </form>
            ) : <Button size="sm" variant="outline" onClick={() => setForm({ finding: f.id, text: f.next, owner: OWNERS[0]!, due: "2026-02-28" })}>Assign corrective action</Button>}
          </li>))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Contradictory evidence">{inv.contradictions.length ? <ul className="list-disc pl-4 text-sm">{inv.contradictions.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="text-sm text-muted-foreground">None recorded.</p>}</Panel>
        <Panel title="Limitations">{inv.limitations.length ? <ul className="list-disc pl-4 text-sm">{inv.limitations.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="text-sm text-muted-foreground">None recorded.</p>}</Panel>
      </div>
      <Notice>Arithmetic is computed deterministically. Narrative is predefined demo text; no claim is marked Verified without passing source, period, unit and reconciliation checks.</Notice>
    </div>
  );
}
