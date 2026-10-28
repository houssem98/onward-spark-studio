import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Sparkles } from "lucide-react";
import { DEPARTMENTS, quarterlyRevenue } from "@/data/finance";
import { MODELS } from "@/data/models";
import { REPORTS, NEXT_STEPS } from "@/data/investigations";
import { SLICES } from "@/data/credit";
import { costToIncome, fmtM, fmtPct, growth, pct, sum } from "@/lib/calc";
import { axisProps, CHART, EvidenceBadge, Kpi, PageHeader, Panel, StatusBadge, tooltipStyle } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/app-store";
import { copilotBus } from "@/lib/copilot-bus";
import { DQ_DIMENSIONS } from "@/data/datasets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Overview — BankIntelli" },
      { name: "description", content: "Bank-wide command center for performance, risk, data quality and AI model health." },
      { property: "og:title", content: "Executive Overview — BankIntelli" },
      { property: "og:description", content: "Bank-wide command center for performance, risk, data quality and AI model health." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const navigate = useNavigate();
  const [q, setQ] = useState("Why did our credit division revenue grow more slowly than our competitors this year?");
  const issues = useStore((s) => s.issues);
  const alerts = useStore((s) => s.alerts);
  const drift = useStore((s) => s.driftAlerts);
  const invs = useStore((s) => s.investigations);
  const actions = useStore((s) => s.actions);

  const rev = sum(DEPARTMENTS.map((d) => d.revenue));
  const prior = sum(DEPARTMENTS.map((d) => d.prior));
  const opex = sum(DEPARTMENTS.map((d) => d.expenses));
  const priorOpex = sum(DEPARTMENTS.map((d) => d.priorExpenses));
  const bal = sum(SLICES.map((s) => s.balance));
  const npl = sum(SLICES.map((s) => s.npl));
  const openAlerts = alerts.filter((a) => a.status !== "Closed");
  const dqAvg = sum(DQ_DIMENSIONS.filter((d) => d.score !== null).map((d) => d.score!)) / DQ_DIMENSIONS.filter((d) => d.score !== null).length;
  const modelAlerts = drift.filter((d) => d.status !== "Closed").length;
  const critical = issues.filter((i) => i.severity === "Critical" && i.status !== "Resolved").length + drift.filter((d) => d.severity === "High" && d.status === "Open").length;
  const q4 = quarterlyRevenue();

  return (
    <div className="space-y-5">
      <PageHeader title="Executive Overview" description="Northstar Bank (fictional) · FY2025 · USD millions · IFRS basis (synthetic)" />

      <form
        className="flex flex-col gap-2 rounded-md border bg-ink p-4 text-ink-foreground md:flex-row md:items-center"
        onSubmit={(e) => { e.preventDefault(); copilotBus.ask(q); }}
      >
        <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-cyan" /> Ask BankIntelli</div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 border-sidebar-border bg-ink-2 text-ink-foreground" aria-label="Question" />
        <Button type="submit">Investigate</Button>
        <Button type="button" variant="secondary" onClick={() => navigate({ to: "/investigations/$id", params: { id: "INV-2025-014" } })}>Open investigation</Button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Operating income" value={fmtM(rev, 0)} delta={`${growth(rev, prior).toFixed(1)}% YoY`} deltaGood definition="Sum of operating income across revenue-generating units." />
        <Kpi label="Operating expenses" value={fmtM(opex, 0)} delta={`${growth(opex, priorOpex).toFixed(1)}% YoY`} deltaGood={false} definition="Total operating expenses including cost centers." />
        <Kpi label="Cost-to-income" value={fmtPct(costToIncome(opex, rev))} delta={`${(costToIncome(opex, rev) - costToIncome(priorOpex, prior)).toFixed(1)}pp`} deltaGood={costToIncome(opex, rev) < costToIncome(priorOpex, prior)} definition="Operating expenses ÷ operating income." />
        <Kpi label="Credit exposure" value={fmtM(bal, 0)} sub="balance" definition="Outstanding loan balance (stock) at period end." period="31 Dec 2025" />
        <Kpi label="NPL ratio" value={fmtPct(pct(npl, bal), 2)} sub="90+ DPD" definition="Non-performing balance ÷ outstanding balance." period="31 Dec 2025" />
        <Kpi label="Fin. crime alerts" value={String(openAlerts.length)} sub="open" definition="Open fraud and AML alerts (synthetic)." period="As of 14 Jan 2026" />
        <Kpi label="Data quality" value={dqAvg.toFixed(1)} sub="simulated score" definition="Mean of measurable dimension scores. Accuracy excluded (not independently measurable). Simulated, not a real measurement." period="Week 02" />
        <Kpi label="Model alerts" value={`${modelAlerts}/${MODELS.length}`} sub={`${critical} critical findings`} definition="Open drift/performance alerts over models in inventory." period="As of 14 Jan 2026" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Revenue and profit trend" subtitle="Quarterly · USD M · derived from department annuals" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={q4}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="quarter" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area dataKey="total" name="Operating income" stroke={CHART.c1} fill={CHART.c1} fillOpacity={0.12} />
              <Area dataKey="expenses" name="Expenses" stroke={CHART.c3} fill={CHART.c3} fillOpacity={0.06} />
              <Area dataKey="profit" name="Pre-provision profit" stroke={CHART.c2} fill={CHART.c2} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Latest executive report">
          {REPORTS.map((r) => (
            <Link key={r.id} to="/reports/$id" params={{ id: r.id }} className="mb-2 block rounded-md border p-3 hover:bg-accent/40">
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{r.title}</span><EvidenceBadge state={r.state} /></div>
              <div className="mt-1 text-xs text-muted-foreground">{r.id} · {r.period} · {r.status}</div>
            </Link>
          ))}
          <p className="text-xs text-muted-foreground">A report is only labeled Verified when every material finding passes the verification workflow and a reviewer signs off.</p>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Department performance vs target" subtitle="FY2025 · USD M" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={DEPARTMENTS.filter((d) => !d.costCenter)}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="name" {...axisProps} interval={0} tickFormatter={(v: string) => v.split(" ")[0] ?? v} />
              <YAxis {...axisProps} width={40} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Actual" fill={CHART.c1} radius={[2, 2, 0, 0]} />
              <Bar dataKey="target" name="Target" fill={CHART.c2} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Risk & control overview">
          <ul className="space-y-2 text-sm">
            {issues.filter((i) => i.status !== "Resolved").slice(0, 3).map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-2"><Link to="/data" className="hover:underline">{i.id} · {i.title}</Link><StatusBadge value={i.severity} /></li>
            ))}
            {drift.filter((d) => d.status !== "Closed").map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-2"><Link to="/models/$id" params={{ id: d.model }} className="hover:underline">{d.model} · {d.title}</Link><StatusBadge value={d.status} /></li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Recent investigations" actions={<Link to="/investigations" className="text-xs text-primary">All <ArrowRight className="inline h-3 w-3" /></Link>}>
          <ul className="divide-y">
            {invs.slice(0, 4).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link to="/investigations/$id" params={{ id: i.id }} className="min-w-0 hover:underline"><span className="num text-xs text-muted-foreground">{i.id}</span> {i.title}</Link>
                <div className="flex shrink-0 gap-1.5"><StatusBadge value={i.status} /><EvidenceBadge state={i.state} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recommended actions">
          <ul className="divide-y">
            {NEXT_STEPS.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link to={n.link} className="hover:underline">{n.text}</Link>
                <span className="shrink-0 text-xs text-muted-foreground">{n.owner} · due <span className="num">{n.due}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{actions.filter((a) => a.status !== "Done").length} open actions in the register.</p>
        </Panel>
      </div>
    </div>
  );
}
