import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, FilterSelect, type Column } from "@/components/DataTable";
import { axisProps, CHART, Kpi, Notice, PageHeader, Panel, StatusBadge, tooltipStyle } from "@/components/kit";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CRIME_TREND, INVESTIGATORS_LIST, type CrimeAlert } from "@/data/crime";
import { actions, useStore } from "@/store/app-store";

export const Route = createFileRoute("/crime/")({
  head: () => ({
    meta: [
      { title: "Financial Crime Center — BankIntelli" },
      { name: "description", content: "Fraud and AML alert monitoring, case management and investigation." },
      { property: "og:title", content: "Financial Crime Center — BankIntelli" },
      { property: "og:description", content: "Fraud and AML alert monitoring, case management and investigation." },
    ],
  }),
  component: CrimePage,
});

function CrimePage() {
  const navigate = useNavigate();
  const alerts = useStore((s) => s.alerts);
  const cases = useStore((s) => s.cases);
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [cat, setCat] = useState("All");
  const [sel, setSel] = useState<string | null>(null);
  const a = alerts.find((x) => x.id === sel);

  const rows = useMemo(() => alerts.filter((x) => (type === "All" || x.type === type) && (status === "All" || x.status === status) && (cat === "All" || x.category === cat)), [alerts, type, status, cat]);
  const open = alerts.filter((x) => x.status !== "Closed");
  const workload = INVESTIGATORS_LIST.map((i) => ({ name: i, open: open.filter((x) => x.investigator === i).length }));

  const cols: Column<CrimeAlert>[] = [
    { key: "id", header: "Alert", cell: (r) => <span className="num text-xs">{r.id}</span> },
    { key: "timestamp", header: "Time", cell: (r) => <span className="num text-xs">{r.timestamp}</span> },
    { key: "category", header: "Category" },
    { key: "amount", header: "Amount", align: "right", cell: (r) => `${r.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${r.currency}` },
    { key: "channel", header: "Channel" },
    { key: "score", header: "Score", align: "right" },
    { key: "signal", header: "Rule / signal", cell: (r) => <span className="text-xs">{r.signal}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "investigator", header: "Investigator" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Fraud, AML & Financial Crime" description="All customers, transactions and entities are fictional. Alerts indicate suspicious activity for review; they are not determinations of wrongdoing." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Open fraud alerts" value={String(open.filter((x) => x.type === "Fraud").length)} definition="Fraud alerts not closed." period="As of 14 Jan 2026" />
        <Kpi label="Open AML alerts" value={String(open.filter((x) => x.type === "AML").length)} definition="AML alerts not closed." period="As of 14 Jan 2026" />
        <Kpi label="Critical cases" value={String(cases.filter((c) => c.priority === "Critical" && c.status !== "Closed").length)} definition="Open cases with Critical priority." period="As of 14 Jan 2026" />
        <Kpi label="Avg alert age" value={`${(open.reduce((s, x) => s + x.ageDays, 0) / Math.max(open.length, 1)).toFixed(1)}d`} definition="Mean days since alert generation for open alerts." period="As of 14 Jan 2026" />
        <Kpi label="SLA breaches" value={String(open.filter((x) => x.ageDays > 10).length)} sub=">10 days" definition="Open alerts older than the 10-day triage SLA." period="As of 14 Jan 2026" />
        <Kpi label="False-positive rate" value="N/A" sub="labels unreliable" definition="Not shown: confirmed outcomes are unavailable for most alerts." period="—" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Alert volume trend" subtitle="Weekly · synthetic" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={220}><BarChart data={CRIME_TREND}><CartesianGrid vertical={false} stroke={CHART.grid} /><XAxis dataKey="week" {...axisProps} /><YAxis {...axisProps} width={35} /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="fraud" stackId="a" fill={CHART.c1} /><Bar dataKey="aml" stackId="a" fill={CHART.c2} /></BarChart></ResponsiveContainer>
        </Panel>
        <Panel title="Open cases">
          <ul className="divide-y">{cases.map((c) => (
            <li key={c.id} className="py-2 text-sm"><Link to="/crime/$id" params={{ id: c.id }} className="font-medium hover:underline">{c.id} · {c.title}</Link>
              <div className="mt-1 flex gap-1.5"><StatusBadge value={c.priority} /><StatusBadge value={c.status} /><span className="text-xs text-muted-foreground">{c.assignee}</span></div></li>
          ))}</ul>
          <p className="eyebrow mt-3 mb-1">Investigator workload</p>
          <ul className="text-xs">{workload.map((w) => <li key={w.name} className="flex justify-between"><span>{w.name}</span><span className="num">{w.open}</span></li>)}</ul>
        </Panel>
      </div>

      <DataTable rows={rows} columns={cols} rowKey={(r) => r.id} exportName="crime-alerts" onRowClick={(r) => setSel(r.id)} selectedKey={sel ?? undefined}
        toolbar={<><FilterSelect label="Type" value={type} options={["Fraud", "AML"]} onChange={setType} /><FilterSelect label="Status" value={status} options={["New", "Triage", "Investigation", "Review", "Closed", "Escalated"]} onChange={setStatus} /><FilterSelect label="Category" value={cat} options={[...new Set(alerts.map((x) => x.category))]} onChange={setCat} /></>} />

      <Sheet open={!!a} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {a && <>
            <SheetHeader><SheetTitle>{a.id} · {a.category}</SheetTitle><p className="text-xs text-muted-foreground">Suspicious activity indicator — fictional customer {a.customer}</p></SheetHeader>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="eyebrow">Amount</dt><dd className="num">{a.amount.toLocaleString()} {a.currency}</dd></div>
              <div><dt className="eyebrow">Score</dt><dd className="num">{a.score}</dd></div>
              <div><dt className="eyebrow">Channel</dt><dd>{a.channel}</dd></div>
              <div><dt className="eyebrow">Signal</dt><dd>{a.signal}</dd></div>
            </dl>
            <label className="mt-4 block text-xs text-muted-foreground">Assign investigator
              <select className="mt-1 block h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground" value={a.investigator} onChange={(e) => actions.updateAlert(a.id, { investigator: e.target.value, status: a.status === "New" ? "Triage" : a.status })}>
                <option>Unassigned</option>{INVESTIGATORS_LIST.map((i) => <option key={i}>{i}</option>)}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["Triage", "Investigation", "Review"] as const).map((s) => <Button key={s} size="sm" variant="outline" disabled={a.status === s} onClick={() => actions.updateAlert(a.id, { status: s })}>{s}</Button>)}
              <Button size="sm" variant="outline" onClick={() => { if (confirm(`Close ${a.id}? This simulated action is recorded in the audit trail.`)) actions.updateAlert(a.id, { status: "Closed" }); }}>Close</Button>
            </div>
            {a.caseId && <Button className="mt-4" onClick={() => navigate({ to: "/crime/$id", params: { id: a.caseId! } })}>Open case {a.caseId}</Button>}
            <div className="mt-4"><Notice>Status changes are simulated and logged to the audit trail.</Notice></div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
