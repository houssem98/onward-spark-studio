import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Stagger } from "@/components/motion";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  Database,
  Landmark,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { costToIncome, diff, fmtFixed, fmtM, fmtPct, growth, mean, pct, sum } from "@/lib/calc";
import {
  axisProps,
  CHART,
  EvidenceBadge,
  Kpi,
  KpiBand,
  PageHeader,
  Panel,
  StatusBadge,
  tooltipStyle,
  TYPE,
} from "@/components/kit";
import { ChartFrame } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { revenueGapInvestigation, useStore } from "@/store/app-store";
import { copilotBus } from "@/lib/copilot-bus";
import { creditQuery, datasetsQuery, financeQuery, investigationsQuery } from "@/repo/queries";

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(financeQuery),
      queryClient.ensureQueryData(creditQuery),
      queryClient.ensureQueryData(datasetsQuery),
      queryClient.ensureQueryData(investigationsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Executive Overview — BankIntelli" },
      {
        name: "description",
        content:
          "Bank-wide command center for performance, risk, data quality and AI model health.",
      },
      { property: "og:title", content: "Executive Overview — BankIntelli" },
      {
        property: "og:description",
        content:
          "Bank-wide command center for performance, risk, data quality and AI model health.",
      },
    ],
  }),
  component: Overview,
});

const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

function Overview() {
  const navigate = useNavigate();
  const { departments, quarterlyRevenue, peers } = useSuspenseQuery(financeQuery).data;
  const { slices } = useSuspenseQuery(creditQuery).data;
  const { dimensions: dqDimensions, datasets } = useSuspenseQuery(datasetsQuery).data;
  const { reports, nextSteps } = useSuspenseQuery(investigationsQuery).data;
  const user = useStore((s) => s.user);
  const issues = useStore((s) => s.issues);
  const alerts = useStore((s) => s.alerts);
  const drift = useStore((s) => s.driftAlerts);
  const cases = useStore((s) => s.cases);
  const cert = useStore((s) => s.certification);
  const invs = useStore((s) => s.investigations);
  const gapInv = useStore(revenueGapInvestigation);
  const actions = useStore((s) => s.actions);
  const [range, setRange] = useState<"4q" | "8q">("8q");

  const rev = sum(departments.map((d) => d.revenue));
  const prior = sum(departments.map((d) => d.prior));
  const opex = sum(departments.map((d) => d.expenses));
  const priorOpex = sum(departments.map((d) => d.priorExpenses));
  const cirChange = diff(costToIncome(opex, rev), costToIncome(priorOpex, prior));
  const bal = sum(slices.map((s) => s.balance));
  const npl = sum(slices.map((s) => s.npl));
  const openAlerts = alerts.filter((a) => a.status !== "Closed");
  const dqAvg = mean(dqDimensions.flatMap((d) => (d.score === null ? [] : [d.score])));
  const series = range === "8q" ? quarterlyRevenue : quarterlyRevenue.slice(4);

  const candidates = [
    ...issues
      .filter(
        (i) => i.status !== "Resolved" && (i.severity === "Critical" || i.severity === "High"),
      )
      .map((i) => ({
        key: i.id,
        title: i.title,
        text: i.detail,
        badge: <StatusBadge value={i.severity} />,
        severity: i.severity,
        date: i.detected,
        module: "Data Governance",
        link: <Link to="/data" className="absolute inset-0" aria-label={i.title} />,
      })),
    ...drift
      .filter((d) => d.status !== "Closed")
      .map((d) => ({
        key: d.id,
        title: `${d.model}: ${d.title}`,
        text: "Drift indicates input change against the approved reference; further validation may be needed.",
        badge: <StatusBadge value={d.status} />,
        severity: d.severity,
        date: d.raised.slice(0, 10),
        module: "Model Governance",
        link: (
          <Link
            to="/models/$id"
            params={{ id: d.model }}
            className="absolute inset-0"
            aria-label={`${d.model}: ${d.title}`}
          />
        ),
      })),
    ...cases
      .filter((c) => c.status !== "Closed")
      .map((c) => ({
        key: c.id,
        title: `${c.id}: ${c.title}`,
        text: "Suspicious activity indicator under review, not a determination.",
        badge: <StatusBadge value={c.priority} />,
        severity: c.priority,
        date: c.opened,
        module: "Financial Crime",
        link: (
          <Link
            to="/crime/$id"
            params={{ id: c.id }}
            className="absolute inset-0"
            aria-label={`${c.id}: ${c.title}`}
          />
        ),
      })),
    ...(gapInv.status === "Closed"
      ? []
      : [
          {
            key: gapInv.id,
            title: gapInv.title,
            text: gapInv.question,
            badge: <EvidenceBadge state={gapInv.state} />,
            severity: gapInv.priority,
            date: gapInv.created,
            module: "Performance",
            link: (
              <Link
                to="/investigations/$id"
                params={{ id: gapInv.id }}
                className="absolute inset-0"
                aria-label={gapInv.title}
              />
            ),
          },
        ]),
  ].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.date.localeCompare(a.date),
  );
  const intel = candidates.slice(0, 6);

  const modules = [
    {
      to: "/credit" as const,
      icon: Landmark,
      title: "Credit Intelligence",
      desc: "Portfolio monitoring, NPL and delinquency, exposure and concentration risk.",
      metric: fmtM(bal, 0),
      metricLabel: "Outstanding balance",
    },
    {
      to: "/performance" as const,
      icon: TrendingUp,
      title: "Performance & Peer Benchmarking",
      desc: "Bank performance, peer comparisons, financial ratios and revenue analysis.",
      metric: `${peers.filter((p) => p.source !== "NOT_AVAILABLE").length} peers`,
      metricLabel: "With permitted data",
    },
    {
      to: "/crime" as const,
      icon: ShieldAlert,
      title: "Fraud, AML & Financial Crime",
      desc: "Alert monitoring, investigation workflows, risk indicators and cases.",
      metric: `${openAlerts.length} alerts`,
      metricLabel: "Open",
    },
    {
      to: "/data" as const,
      icon: Database,
      title: "Data & AI Governance",
      desc: "Data quality, lineage, model inventory and model monitoring.",
      metric: `${Object.values(cert).filter((c) => c === "Certified").length} of ${datasets.length}`,
      metricLabel: "Datasets certified",
    },
  ];

  return (
    <Stagger className="space-y-section">
      <PageHeader
        title="Executive Overview"
        meta="Northstar Bank (fictional) · FY2025 · USD millions · IFRS basis (synthetic)"
        description={`Welcome back, ${user.name.split(" ")[0]}. What needs attention first, then how the bank is performing.`}
        actions={
          <>
            <Button
              variant="outline"
              className="bg-card"
              onClick={() =>
                copilotBus.ask(
                  "Why did our credit division revenue grow more slowly than our competitors this year?",
                )
              }
            >
              <Search className="h-4 w-4" /> Ask about credit vs peers
            </Button>
            <Button
              onClick={() => navigate({ to: "/investigations/$id", params: { id: gapInv.id } })}
            >
              Open investigation <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <Panel
        title="Needs attention"
        subtitle={`Top ${intel.length} of ${candidates.length} open · from records in this workspace · not live AI output`}
        bodyClass="p-0"
      >
        <ul className="grid md:grid-cols-2 xl:grid-cols-3">
          {intel.map((i) => (
            <li
              key={i.key}
              data-severity={i.severity}
              className="relative border-b px-5 py-3.5 transition-colors hover:bg-accent/40"
            >
              {i.link}
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug">{i.title}</span>
                <span className="relative">{i.badge}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.text}</p>
              <p className="mt-1.5 text-caption text-muted-foreground">
                <span className="num">{i.date}</span> · {i.module}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <KpiBand label="Decision KPIs" className="sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          className="sm:col-span-2 xl:col-span-1"
          basis
          def="operating_income"
          value={fmtM(rev, 0)}
          inputs={departments.map((d) => ({ label: d.name, value: fmtM(d.revenue) }))}
          delta={fmtPct(growth(rev, prior))}
          versus="vs FY2024"
          deltaGood
        />
        <Kpi
          basis
          def="cost_to_income"
          value={fmtPct(costToIncome(opex, rev))}
          inputs={[
            { label: "Operating expenses", value: fmtM(opex) },
            { label: "Operating income", value: fmtM(rev) },
          ]}
          delta={fmtFixed(cirChange, 1, "pp")}
          versus="vs FY2024"
          deltaGood={cirChange !== null && cirChange < 0}
        />
        <Kpi
          basis
          def="npl_ratio"
          value={fmtPct(pct(npl, bal), 2)}
          inputs={[
            { label: "Non-performing balance", value: fmtM(npl) },
            { label: "Outstanding balance", value: fmtM(bal) },
          ]}
        />
        <Kpi
          basis
          def="outstanding_balance"
          value={fmtM(bal, 0)}
          inputs={[{ label: `Balances of ${slices.length} portfolio slices`, value: fmtM(bal) }]}
        />
        <Kpi
          basis
          def="dq_dimension_mean"
          value={fmtFixed(dqAvg)}
          inputs={dqDimensions.map((d) => ({
            label: d.dimension,
            value: d.score === null ? "not measurable, left out" : String(d.score),
          }))}
        />
      </KpiBand>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartFrame
          title="Financial performance"
          description="Quarterly, derived from department annual figures"
          unit="USD M"
          period={range === "8q" ? "Q1-24 to Q4-25" : "Q1-25 to Q4-25"}
          source="Synthetic finance data (demo data)"
          rows={series}
          columns={[
            { key: "quarter", header: "Quarter" },
            { key: "total", header: "Operating income" },
            { key: "expenses", header: "Expenses" },
            { key: "profit", header: "Pre-provision profit" },
          ]}
          actions={
            <div className="flex rounded-lg border p-0.5 text-xs">
              {(["4q", "8q"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  className={
                    range === r
                      ? "rounded-md bg-primary px-2.5 py-1 text-primary-foreground"
                      : "rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground"
                  }
                >
                  {r === "4q" ? "FY2025" : "8 quarters"}
                </button>
              ))}
            </div>
          }
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ left: -8, right: 4 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.c1} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART.c1} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.c2} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART.c2} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
              <XAxis dataKey="quarter" {...axisProps} />
              <YAxis {...axisProps} width={44} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtM(v)} />
              <Legend
                wrapperStyle={{ fontSize: TYPE.caption, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                dataKey="total"
                name="Operating income"
                stroke={CHART.c1}
                strokeWidth={2.2}
                fill="url(#gIncome)"
              />
              <Area
                dataKey="profit"
                name="Pre-provision profit"
                stroke={CHART.c2}
                strokeWidth={2.2}
                fill="url(#gProfit)"
              />
              <Area
                dataKey="expenses"
                name="Expenses"
                stroke={CHART.c3}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
        <Panel title="Risk & control overview" bodyClass="p-0">
          <ul className="divide-y text-sm">
            {issues
              .filter((i) => i.status !== "Resolved")
              .slice(0, 3)
              .map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2 px-5 py-3">
                  <Link to="/data" className="hover:text-primary">
                    {i.id} · {i.title}
                  </Link>
                  <StatusBadge value={i.severity} />
                </li>
              ))}
            {drift
              .filter((d) => d.status !== "Closed")
              .map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-2 px-5 py-3">
                  <Link to="/models/$id" params={{ id: d.model }} className="hover:text-primary">
                    {d.model} · {d.title}
                  </Link>
                  <StatusBadge value={d.status} />
                </li>
              ))}
          </ul>
        </Panel>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Intelligence modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((m) => (
            <Link key={m.to} to={m.to} className="card-surface card-lift group flex flex-col p-5">
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <m.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
              <div className="mt-4 border-t pt-3">
                <div className="num text-lg font-semibold">{m.metric}</div>
                <div className="text-caption text-muted-foreground">{m.metricLabel}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartFrame
          title="Department performance vs target"
          description="Revenue-generating departments; cost centres excluded"
          unit="USD M"
          period="FY2025"
          source="Synthetic finance data and budget targets (demo data)"
          rows={departments
            .filter((d) => !d.costCenter)
            .map((d) => ({
              name: d.name,
              revenue: d.revenue,
              target: d.target,
            }))}
          columns={[
            { key: "name", header: "Department" },
            { key: "revenue", header: "Actual" },
            { key: "target", header: "Target" },
          ]}
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={departments.filter((d) => !d.costCenter)}
              margin={{ left: -8 }}
              barGap={3}
            >
              <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                {...axisProps}
                interval={0}
                tickFormatter={(v: string) => v.split(" ")[0] ?? v}
              />
              <YAxis {...axisProps} width={44} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Legend wrapperStyle={{ fontSize: TYPE.caption }} iconType="circle" iconSize={8} />
              <Bar dataKey="revenue" name="Actual" fill={CHART.c1} radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="target"
                name="Target"
                fill={CHART.c2}
                fillOpacity={0.55}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
        <Panel title="Latest executive report" bodyClass="space-y-3">
          {reports.map((r) => (
            <Link
              key={r.id}
              to="/reports/$id"
              params={{ id: r.id }}
              className="card-lift block rounded-lg border p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{r.title}</span>
                <EvidenceBadge state={r.state} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {r.id} · {r.period} · {r.status}
              </div>
            </Link>
          ))}
          <p className="text-xs text-muted-foreground">
            Report states here come from the demo data. No verification workflow or reviewer
            sign-off exists yet.
          </p>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Recent investigations"
          actions={
            <Link to="/investigations" className="text-xs font-medium text-primary">
              View all <ArrowRight className="inline h-3 w-3" />
            </Link>
          }
          bodyClass="p-0"
        >
          <ul className="divide-y">
            {invs.slice(0, 4).map((i) => (
              <li key={i.id} className="px-5 py-3 text-sm">
                <Link
                  to="/investigations/$id"
                  params={{ id: i.id }}
                  className="font-medium hover:text-primary"
                >
                  {i.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="num text-caption text-muted-foreground">{i.id}</span>
                  <StatusBadge value={i.status} />
                  <EvidenceBadge state={i.state} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Recommended actions"
          subtitle={`${actions.filter((a) => a.status !== "Done").length} open in the action register`}
          bodyClass="p-0"
        >
          <ul className="divide-y">
            {nextSteps.map((n) => (
              <li key={n.id} className="px-5 py-3 text-sm">
                <Link to={n.link} className="font-medium hover:text-primary">
                  {n.text}
                </Link>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {n.owner} · due <span className="num">{n.due}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Stagger>
  );
}
