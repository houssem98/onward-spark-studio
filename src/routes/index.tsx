import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ArrowUpRight, BrainCircuit, Database, Landmark, Search, ShieldAlert, TrendingUp } from "lucide-react";
import { DEPARTMENTS, PEERS, quarterlyRevenue, BANK } from "@/data/finance";
import { MODELS } from "@/data/models";
import { REPORTS, NEXT_STEPS } from "@/data/investigations";
import { CREDIT_TREND, SLICES } from "@/data/credit";
import { DQ_DIMENSIONS, DATASETS } from "@/data/datasets";
import { costToIncome, fmtM, fmtPct, growth, pct, sum } from "@/lib/calc";
import { axisProps, CHART, EvidenceBadge, Kpi, Panel, StatusBadge, SyntheticTag, tooltipStyle } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/app-store";
import { copilotBus } from "@/lib/copilot-bus";
import skyline from "@/assets/skyline.jpg";

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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Overview() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const issues = useStore((s) => s.issues);
  const alerts = useStore((s) => s.alerts);
  const drift = useStore((s) => s.driftAlerts);
  const invs = useStore((s) => s.investigations);
  const actions = useStore((s) => s.actions);
  const cases = useStore((s) => s.cases);
  const cert = useStore((s) => s.certification);
  const [range, setRange] = useState<"8q" | "4q">("8q");

  const rev = sum(DEPARTMENTS.map((d) => d.revenue));
  const prior = sum(DEPARTMENTS.map((d) => d.prior));
  const opex = sum(DEPARTMENTS.map((d) => d.expenses));
  const priorOpex = sum(DEPARTMENTS.map((d) => d.priorExpenses));
  const bal = sum(SLICES.map((s) => s.balance));
  const npl = sum(SLICES.map((s) => s.npl));
  const cir = costToIncome(opex, rev);
  const priorCir = costToIncome(priorOpex, prior);
  const openAlerts = alerts.filter((a) => a.status !== "Closed");
  const measurable = DQ_DIMENSIONS.filter((d) => d.score !== null);
  const dqAvg = sum(measurable.map((d) => d.score!)) / measurable.length;
  const modelAlerts = drift.filter((d) => d.status !== "Closed").length;
  const critical = issues.filter((i) => i.severity === "Critical" && i.status !== "Resolved").length + drift.filter((d) => d.severity === "High" && d.status === "Open").length;
  const q = quarterlyRevenue();
  const series = range === "8q" ? q : q.slice(4);
  const firstName = user.name.split(" ")[0];

  const intel = [
    ...issues.filter((i) => i.status !== "Resolved" && (i.severity === "Critical" || i.severity === "High")).slice(0, 2).map((i) => ({ key: i.id, title: i.title, text: i.detail, badge: <StatusBadge value={i.severity} />, date: i.detected, to: "/data" as const, module: "Data Governance" })),
    ...drift.filter((d) => d.status !== "Closed").slice(0, 1).map((d) => ({ key: d.id, title: `${d.model}: ${d.title}`, text: "Drift indicates input change vs approved reference; further validation may be needed.", badge: <StatusBadge value={d.status} />, date: d.raised.slice(0, 10), to: "/models" as const, module: "Model Governance" })),
    ...cases.filter((c) => c.status !== "Closed").slice(0, 1).map((c) => ({ key: c.id, title: `${c.id}: ${c.title}`, text: "Suspicious activity indicator under review — not a determination.", badge: <StatusBadge value={c.priority} />, date: c.opened, to: "/crime" as const, module: "Financial Crime" })),
    { key: "INV-2025-014", title: "Credit revenue −$30.0M vs peer benchmark", text: "Volume, pricing and mix explain −$28.0M; −$2.0M residual unexplained.", badge: <EvidenceBadge state="PARTIALLY_VERIFIED" />, date: "FY2025", to: "/performance" as const, module: "Performance" },
  ];

  const modules = [
    { to: "/credit" as const, icon: Landmark, title: "Credit Intelligence", desc: "Portfolio monitoring, NPL and delinquency, exposure and concentration risk.", metric: fmtM(bal, 0), metricLabel: "Outstanding balance" },
    { to: "/performance" as const, icon: TrendingUp, title: "Performance & Peer Benchmarking", desc: "Bank performance, peer comparisons, financial ratios and revenue analysis.", metric: `${PEERS.filter((p) => p.source !== "NOT_AVAILABLE").length} peers`, metricLabel: "With permitted data" },
    { to: "/crime" as const, icon: ShieldAlert, title: "Fraud, AML & Financial Crime", desc: "Alert monitoring, investigation workflows, risk indicators and cases.", metric: String(openAlerts.length), metricLabel: "Open alerts" },
    { to: "/data" as const, icon: Database, title: "Data & AI Governance", desc: "Data quality, lineage, model inventory and model monitoring.", metric: `${Object.values(cert).filter((c) => c === "Certified").length}/${DATASETS.length}`, metricLabel: `Datasets certified · ${MODELS.length} models` },
  ];

  return (
    <div className="space-y-7">
      {/* Welcome */}
      <section className="card-surface relative overflow-hidden">
        <img src={skyline} alt="" aria-hidden width={1600} height={544} className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-none select-none object-cover opacity-90 md:block" />
        <div className="relative flex flex-col gap-5 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2"><SyntheticTag /><span className="text-xs text-muted-foreground">{BANK.name} (fictional) · FY2025 · USD millions</span></div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{greeting()}, {firstName}</h1>
            <p className="mt-1.5 text-muted-foreground">Here is your bank's performance and risk overview.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate({ to: "/investigations/$id", params: { id: "INV-2025-014" } })}>Start Investigation <ArrowRight className="h-4 w-4" /></Button>
            <Button variant="outline" className="bg-card" onClick={() => copilotBus.ask("Why did our credit division revenue grow more slowly than our competitors this year?")}><Search className="h-4 w-4" /> Ask about credit vs peers</Button>
          </div>
        </div>
      </section>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi size="lg" label="Operating income" value={fmtM(rev, 0)} delta={`${growth(rev, prior).toFixed(1)}% vs FY2024`} deltaGood spark={q.map((x) => x.total as number)} definition="Sum of operating income across revenue-generating units." />
        <Kpi size="lg" label="Operating expenses" value={fmtM(opex, 0)} delta={`${growth(opex, priorOpex).toFixed(1)}% vs FY2024`} deltaGood={false} spark={q.map((x) => x.expenses as number)} definition="Total operating expenses including cost centers." />
        <Kpi size="lg" label="Cost-to-income ratio" value={fmtPct(cir)} delta={`${(cir - priorCir).toFixed(1)}pp vs FY2024`} deltaGood={cir < priorCir} spark={q.map((x) => ((x.expenses as number) / (x.total as number)) * 100)} definition="Operating expenses ÷ operating income." />
        <Kpi size="lg" label="NPL ratio" value={fmtPct(pct(npl, bal), 2)} sub="90+ DPD · 31 Dec 2025" spark={CREDIT_TREND.map((x) => x.npl)} deltaGood={false} definition="Non-performing balance ÷ outstanding balance. Sparkline: quarterly bank-wide NPL ratio." period="31 Dec 2025" />
      </div>

      {/* Secondary metrics */}
      <div className="card-surface grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
        {[
          { l: "Credit exposure", v: fmtM(bal, 0), s: "Balance · 31 Dec 2025", to: "/credit" as const },
          { l: "Fin. crime alerts", v: String(openAlerts.length), s: "Open · as of 14 Jan 2026", to: "/crime" as const },
          { l: "Data quality", v: dqAvg.toFixed(1), s: "Simulated score · Week 02", to: "/data" as const },
          { l: "Model alerts", v: `${modelAlerts} of ${MODELS.length}`, s: `${critical} critical findings open`, to: "/models" as const },
        ].map((m) => (
          <Link key={m.l} to={m.to} className="group px-5 py-4 transition-colors hover:bg-accent/40">
            <div className="eyebrow flex items-center justify-between">{m.l}<ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></div>
            <div className="num mt-1 text-xl font-semibold">{m.v}</div>
            <div className="text-xs text-muted-foreground">{m.s}</div>
          </Link>
        ))}
      </div>

      {/* Financial performance + intelligence */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Financial Performance" subtitle="Quarterly · USD M · derived from department annuals (synthetic)" className="xl:col-span-2"
          actions={<div className="flex rounded-lg border p-0.5 text-xs">{(["4q", "8q"] as const).map((r) => <button key={r} onClick={() => setRange(r)} className={`rounded-md px-2.5 py-1 transition-colors ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r === "4q" ? "FY2025" : "8 quarters"}</button>)}</div>}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ left: -8, right: 4 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.c1} stopOpacity={0.22} /><stop offset="100%" stopColor={CHART.c1} stopOpacity={0} /></linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.c2} stopOpacity={0.2} /><stop offset="100%" stopColor={CHART.c2} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
              <XAxis dataKey="quarter" {...axisProps} />
              <YAxis {...axisProps} width={44} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `$${v.toFixed(1)}M`} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Area dataKey="total" name="Operating income" stroke={CHART.c1} strokeWidth={2.2} fill="url(#gIncome)" animationDuration={700} />
              <Area dataKey="profit" name="Pre-provision profit" stroke={CHART.c2} strokeWidth={2.2} fill="url(#gProfit)" animationDuration={700} />
              <Area dataKey="expenses" name="Expenses" stroke={CHART.c3} strokeWidth={1.5} strokeDasharray="4 3" fill="none" animationDuration={700} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Latest Intelligence" subtitle="From records in this workspace · not live AI output" bodyClass="p-0">
          <ul className="divide-y">
            {intel.map((i) => (
              <li key={i.key}>
                <Link to={i.to} className="block px-5 py-3.5 transition-colors hover:bg-accent/40">
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-medium leading-snug">{i.title}</span>{i.badge}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.text}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground"><span className="num">{i.date}</span> · {i.module}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Modules */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Intelligence modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((m) => (
            <Link key={m.to} to={m.to} className="card-surface card-lift group flex flex-col p-5">
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><m.icon className="h-5 w-5" /></div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
              <div className="mt-4 border-t pt-3"><div className="num text-lg font-semibold">{m.metric}</div><div className="text-[11px] text-muted-foreground">{m.metricLabel}</div></div>
            </Link>
          ))}
        </div>
      </section>

      {/* Supporting */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Department performance vs target" subtitle="FY2025 · USD M" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={DEPARTMENTS.filter((d) => !d.costCenter)} margin={{ left: -8 }} barGap={3}>
              <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" {...axisProps} interval={0} tickFormatter={(v: string) => v.split(" ")[0]} />
              <YAxis {...axisProps} width={44} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar dataKey="revenue" name="Actual" fill={CHART.c1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="Target" fill={CHART.c2} fillOpacity={0.55} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Risk & control overview" bodyClass="p-0">
          <ul className="divide-y text-sm">
            {issues.filter((i) => i.status !== "Resolved").slice(0, 3).map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-2 px-5 py-3"><Link to="/data" className="hover:text-primary">{i.id} · {i.title}</Link><StatusBadge value={i.severity} /></li>
            ))}
            {drift.filter((d) => d.status !== "Closed").map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-2 px-5 py-3"><Link to="/models/$id" params={{ id: d.model }} className="hover:text-primary">{d.model} · {d.title}</Link><StatusBadge value={d.status} /></li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Recent investigations" actions={<Link to="/investigations" className="text-xs font-medium text-primary">View all <ArrowRight className="inline h-3 w-3" /></Link>} bodyClass="p-0">
          <ul className="divide-y">
            {invs.slice(0, 4).map((i) => (
              <li key={i.id} className="px-5 py-3 text-sm">
                <Link to="/investigations/$id" params={{ id: i.id }} className="font-medium hover:text-primary">{i.title}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="num text-[11px] text-muted-foreground">{i.id}</span><StatusBadge value={i.status} /><EvidenceBadge state={i.state} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recommended actions" subtitle={`${actions.filter((a) => a.status !== "Done").length} open in the action register`} bodyClass="p-0">
          <ul className="divide-y">
            {NEXT_STEPS.map((n) => (
              <li key={n.id} className="px-5 py-3 text-sm">
                <Link to={n.link} className="font-medium hover:text-primary">{n.text}</Link>
                <div className="mt-0.5 text-xs text-muted-foreground">{n.owner} · due <span className="num">{n.due}</span></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Reports & evidence state" bodyClass="space-y-3">
          {REPORTS.map((r) => (
            <Link key={r.id} to="/reports/$id" params={{ id: r.id }} className="card-lift block rounded-lg border p-3.5">
              <div className="flex items-start justify-between gap-2"><span className="text-sm font-medium">{r.title}</span><EvidenceBadge state={r.state} /></div>
              <div className="mt-1 text-xs text-muted-foreground">{r.id} · {r.period} · {r.status}</div>
            </Link>
          ))}
          <p className="text-xs text-muted-foreground">A report is only labeled Verified when every material finding passes verification and a reviewer signs off.</p>
        </Panel>
      </div>
    </div>
  );
}
