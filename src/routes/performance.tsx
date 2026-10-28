import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  BANK,
  BRIDGES,
  DEPARTMENTS,
  PEER_BENCHMARK_NOTE,
  PEER_HISTORY,
  PEERS,
  SCORECARD,
} from "@/data/finance";
import {
  axisProps,
  CHART,
  EvidenceBadge,
  Kpi,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
  tooltipStyle,
} from "@/components/kit";
import { Waterfall } from "@/components/charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { costToIncome, fmtM, fmtPct, growth, pct, reconcileBridge, sum } from "@/lib/calc";
import { actions, useStore } from "@/store/app-store";
import { INVESTIGATIONS } from "@/data/investigations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance & Competitor Intelligence — BankIntelli" },
      {
        name: "description",
        content:
          "Executive scorecard, department performance, peer benchmarking and revenue-gap decomposition.",
      },
      { property: "og:title", content: "Performance & Competitor Intelligence — BankIntelli" },
      {
        property: "og:description",
        content:
          "Executive scorecard, department performance, peer benchmarking and revenue-gap decomposition.",
      },
    ],
  }),
  component: PerformancePage,
});

const METRICS = [
  { key: "nim", label: "Net interest margin (%)" },
  { key: "cir", label: "Cost-to-income (%)" },
  { key: "roe", label: "Return on equity (%)" },
  { key: "roa", label: "Return on assets (%)" },
  { key: "creditGrowth", label: "Credit growth (%)" },
  { key: "depositGrowth", label: "Deposit growth (%)" },
  { key: "creditRevenue", label: "Credit revenue (USD M)" },
] as const;

const STEPS = [
  "Select question",
  "Define scope",
  "Choose benchmark",
  "Retrieve evidence",
  "Validate sources",
  "Calculate variances",
  "Rank factors",
  "Measured vs hypothesis",
  "Contradictions",
  "Generate report",
  "Assign actions",
];

function PerformancePage() {
  const navigate = useNavigate();
  const invs = useStore((s) => s.investigations);
  const a = SCORECARD.FY2025,
    b = SCORECARD.FY2024;
  const rev = a.nii + a.nonInterest;
  const opex = sum(DEPARTMENTS.map((d) => d.expenses));
  const priorOpex = sum(DEPARTMENTS.map((d) => d.priorExpenses));
  const nim = pct(a.nii, a.avgEarningAssets);
  const ns = {
    nim,
    cir: costToIncome(opex, rev),
    roe: pct(a.netIncome, a.avgEquity),
    roa: pct(a.netIncome, a.avgAssets),
    creditGrowth: growth(a.loans, a.priorLoans),
    depositGrowth: growth(a.deposits, a.priorDeposits),
    creditRevenue: 120,
  };

  const [peerSel, setPeerSel] = useState<string[]>(PEERS.map((p) => p.id));
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("nim");
  const [method, setMethod] = useState("peer");
  const bridge = BRIDGES.find((x) => x.id === method)!;
  const rec = reconcileBridge(bridge);

  const peerChart = useMemo(
    () =>
      [
        { name: "Northstar", value: +ns[metric].toFixed(2), src: "INTERNAL" },
        ...PEERS.filter((p) => peerSel.includes(p.id)).map((p) => ({
          name: p.name.split(" ")[0],
          value: p[metric],
          src: p.source,
        })),
      ].filter((x) => x.value !== null),
    [peerSel, metric],
  );

  // wizard
  const [step, setStep] = useState(0);
  const [wq, setWq] = useState("Why did credit revenue grow more slowly than peers?");
  const [wDept, setWDept] = useState("credit");
  const [wBench, setWBench] = useState("peer");
  const wb = BRIDGES.find((x) => x.id === wBench)!;
  const wr = reconcileBridge(wb);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const finish = () => {
    const id = `INV-2026-${String(10 + invs.length).padStart(3, "0")}`;
    const base = INVESTIGATIONS[0]!;
    actions.createInvestigation({
      ...base,
      id,
      title: wq,
      question: wq,
      created: "2026-01-14",
      status: "Draft",
      department: DEPARTMENTS.find((d) => d.id === wDept)!.name,
      owner: "J. Avery",
      findings: base.findings.map((f) => ({ ...f, id: f.id.replace("014", id.slice(-3)) })),
    });
    setCreatedId(id);
    toast.success(`${id} created`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enterprise Performance & Competitor Intelligence"
        description={`${BANK.name} · FY2025 · ${BANK.currency} ${BANK.unit} · ${BANK.basis}. Peers are fictional institutions with illustrative metrics.`}
      />
      <Tabs defaultValue="scorecard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="peers">Peer benchmarking</TabsTrigger>
          <TabsTrigger value="bridge">Revenue gap</TabsTrigger>
          <TabsTrigger value="engine">Root-cause engine</TabsTrigger>
        </TabsList>

        <TabsContent value="scorecard" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kpi
              label="Total operating income"
              value={fmtM(rev, 0)}
              delta={`${growth(rev, b.nii + b.nonInterest).toFixed(1)}% YoY`}
              deltaGood
              definition="NII + non-interest income. Source: DS-009 Finance reporting."
            />
            <Kpi
              label="Net interest income"
              value={fmtM(a.nii, 0)}
              delta={`${growth(a.nii, b.nii).toFixed(1)}%`}
              deltaGood
              definition="Interest income − interest expense. Source: DS-001 GL."
            />
            <Kpi
              label="Net interest margin"
              value={fmtPct(nim, 2)}
              delta={`${(nim - pct(b.nii, b.avgEarningAssets)).toFixed(2)}pp`}
              deltaGood={false}
              definition="NII ÷ average earning assets."
            />
            <Kpi
              label="Non-interest income"
              value={fmtM(a.nonInterest, 0)}
              delta={`${growth(a.nonInterest, b.nonInterest).toFixed(1)}%`}
              deltaGood
              definition="Fees, commissions, trading and other income."
            />
            <Kpi
              label="Operating expenses"
              value={fmtM(opex, 0)}
              delta={`${growth(opex, priorOpex).toFixed(1)}%`}
              deltaGood={false}
              definition="Total operating expenses across all units."
            />
            <Kpi
              label="Cost-to-income"
              value={fmtPct(ns.cir)}
              definition="Operating expenses ÷ total operating income."
            />
            <Kpi
              label="Return on assets"
              value={fmtPct(ns.roa, 2)}
              definition="Net income ÷ average total assets."
            />
            <Kpi
              label="Return on equity"
              value={fmtPct(ns.roe)}
              definition="Net income ÷ average shareholders' equity."
            />
            <Kpi
              label="Credit growth"
              value={fmtPct(ns.creditGrowth)}
              definition="Change in period-end gross loans."
              period="FY2025 vs FY2024"
            />
            <Kpi
              label="Deposit growth"
              value={fmtPct(ns.depositGrowth)}
              definition="Change in period-end customer deposits."
              period="FY2025 vs FY2024"
            />
          </div>
          <Notice>
            Market share is not shown: no comparable market-size data source is available.
            Freshness: finance reporting refreshed 2026-01-08.
          </Notice>
        </TabsContent>

        <TabsContent value="departments" className="mt-4 space-y-4">
          <Panel title="Revenue vs target vs prior year" subtitle="USD M">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={DEPARTMENTS.filter((d) => !d.costCenter)}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis
                  dataKey="name"
                  {...axisProps}
                  interval={0}
                  tickFormatter={(v: string) => v.split(" ")[0] ?? v}
                />
                <YAxis {...axisProps} width={40} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="prior" name="FY2024" fill={CHART.c3} fillOpacity={0.4} />
                <Bar dataKey="revenue" name="FY2025" fill={CHART.c1} />
                <Bar dataKey="target" name="Target" fill={CHART.c2} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Business-unit table" bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-caption uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">vs target</th>
                    <th className="px-3 py-2 text-right">Growth</th>
                    <th className="px-3 py-2 text-right">Expenses</th>
                    <th className="px-3 py-2 text-right">Contribution</th>
                    <th className="px-3 py-2 text-right">CIR</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="px-3 py-2">{d.owner}</td>
                      <td className="num px-3 py-2 text-right">{d.costCenter ? "—" : d.revenue}</td>
                      <td
                        className={cn(
                          "num px-3 py-2 text-right",
                          !d.costCenter &&
                            (d.revenue >= d.target ? "text-success" : "text-critical"),
                        )}
                      >
                        {d.costCenter
                          ? "—"
                          : `${d.revenue - d.target >= 0 ? "+" : ""}${d.revenue - d.target}`}
                      </td>
                      <td className="num px-3 py-2 text-right">
                        {d.costCenter ? "—" : `${growth(d.revenue, d.prior).toFixed(1)}%`}
                      </td>
                      <td className="num px-3 py-2 text-right">{d.expenses}</td>
                      <td className="num px-3 py-2 text-right">{d.revenue - d.expenses}</td>
                      <td className="num px-3 py-2 text-right">
                        {d.costCenter
                          ? "Cost center"
                          : `${costToIncome(d.expenses, d.revenue).toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="peers" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3 text-sm">
            <span className="eyebrow">Peer group</span>
            {PEERS.map((p) => (
              <label key={p.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={peerSel.includes(p.id)}
                  onChange={(e) =>
                    setPeerSel(
                      e.target.checked ? [...peerSel, p.id] : peerSel.filter((x) => x !== p.id),
                    )
                  }
                />
                {p.name}
              </label>
            ))}
            <select
              aria-label="Metric"
              className="ml-auto h-8 rounded-md border bg-card px-2"
              value={metric}
              onChange={(e) => setMetric(e.target.value as "nim")}
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              Period FY2025 · USD · % values unitless
            </span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title={METRICS.find((m) => m.key === metric)!.label}
              subtitle="Peers without permitted data are excluded"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={peerChart}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis {...axisProps} width={40} domain={["auto", "auto"]} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" fill={CHART.c1} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="NIM history" subtitle="% · FY2021–FY2025">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={PEER_HISTORY}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="year" {...axisProps} />
                  <YAxis {...axisProps} domain={["auto", "auto"]} width={40} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="northstar" stroke={CHART.c1} strokeWidth={2.5} />
                  <Line dataKey="harborline" stroke={CHART.c2} />
                  <Line dataKey="meridian" stroke={CHART.c4} />
                  <Line dataKey="cascade" stroke={CHART.c3} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>
          <Panel title="Source register & comparability" bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-caption uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Institution</th>
                    <th className="px-3 py-2">Source type</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Comparability</th>
                    <th className="px-3 py-2">Warning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Northstar Bank</td>
                    <td className="px-3 py-2">
                      <StatusBadge value="INTERNAL" tone="info" icon={false} />
                    </td>
                    <td className="px-3 py-2">FY2025</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2 text-xs">—</td>
                  </tr>
                  {PEERS.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          value={p.source}
                          tone={p.source === "NOT_AVAILABLE" ? "neutral" : "info"}
                          icon={false}
                        />
                      </td>
                      <td className="px-3 py-2">{p.period}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          value={p.comparability}
                          tone={
                            p.comparability === "High"
                              ? "success"
                              : p.comparability === "Medium"
                                ? "warning"
                                : "critical"
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">{p.warning ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="bridge" className="mt-4 grid gap-4 xl:grid-cols-3">
          <Panel
            title="Credit revenue bridge"
            subtitle={bridge.method}
            className="xl:col-span-2"
            actions={
              <select
                aria-label="Method"
                className="h-8 rounded-md border bg-card px-2 text-xs"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {BRIDGES.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.method}
                  </option>
                ))}
              </select>
            }
          >
            <Waterfall bridge={bridge} />
            <p className="mt-2 text-xs text-muted-foreground">
              Synthetic figures · illustrative calculation.{" "}
              {method === "peer" && PEER_BENCHMARK_NOTE}
            </p>
          </Panel>
          <Panel title="Reconciliation">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt>{bridge.baseLabel}</dt>
                <dd className="num">{fmtM(bridge.base)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{bridge.actualLabel}</dt>
                <dd className="num">{fmtM(bridge.actual)}</dd>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-medium">
                <dt>Gap</dt>
                <dd className="num">{fmtM(rec.gap)}</dd>
              </div>
              {bridge.steps.map((s) => (
                <div key={s.label} className="flex justify-between text-xs">
                  <dt>
                    {s.label}
                    {s.kind === "residual" && " (residual)"}
                  </dt>
                  <dd className="num">{fmtM(s.value)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1.5">
                <dt>Σ contributions</dt>
                <dd className="num">{fmtM(rec.explained)}</dd>
              </div>
            </dl>
            <div
              className={cn(
                "mt-3 flex items-center gap-2 rounded-md border p-2 text-sm",
                rec.reconciles
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-critical/30 bg-critical/10 text-critical",
              )}
            >
              {rec.reconciles ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}{" "}
              {rec.reconciles
                ? "Contributions reconcile exactly to the gap"
                : `Difference ${rec.difference}`}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Volume = ΔVolume × benchmark yield; Price = ΔYield × actual volume; Mix =
              segment-weighted yield difference. Residuals are labeled, not attributed.
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="engine" className="mt-4 grid gap-4 xl:grid-cols-4">
          <Panel title="Workflow">
            <ol className="space-y-1 text-sm">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    onClick={() => i <= step && setStep(i)}
                    className={cn(
                      "w-full rounded px-2 py-1 text-left",
                      i === step
                        ? "bg-primary text-primary-foreground"
                        : i < step
                          ? "text-success"
                          : "text-muted-foreground",
                    )}
                  >
                    {i + 1}. {s}
                  </button>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title={`Step ${step + 1}: ${STEPS[step]}`} className="xl:col-span-3">
            <div className="min-h-[220px] space-y-3 text-sm">
              {step === 0 && (
                <select
                  aria-label="Investigation question"
                  className="h-9 w-full rounded-md border bg-card px-2"
                  value={wq}
                  onChange={(e) => setWq(e.target.value)}
                >
                  {[
                    "Why did credit revenue grow more slowly than peers?",
                    "Why did credit revenue underperform our target?",
                    "What drove credit revenue change vs last year?",
                  ].map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              )}
              {step === 1 && (
                <div className="flex flex-wrap gap-3">
                  <label>
                    Department{" "}
                    <select
                      className="ml-1 h-9 rounded-md border bg-card px-2"
                      value={wDept}
                      onChange={(e) => setWDept(e.target.value)}
                    >
                      {DEPARTMENTS.filter((d) => !d.costCenter).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="self-center">
                    Metric: operating income · Period: FY2025 · USD M
                  </span>
                  {wDept !== "credit" && (
                    <Notice tone="warning">
                      Decomposition inputs (volume, yield, mix) are only seeded for Credit. This
                      demo still copies the Credit sample findings into an investigation for any
                      department.
                    </Notice>
                  )}
                </div>
              )}
              {step === 2 && (
                <div className="flex gap-2">
                  {BRIDGES.map((x) => (
                    <Button
                      key={x.id}
                      variant={wBench === x.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWBench(x.id)}
                    >
                      {x.baseLabel}
                    </Button>
                  ))}
                </div>
              )}
              {step === 3 && (
                <ul className="list-disc pl-4">
                  <li>DS-009 Finance reporting — credit revenue, yields</li>
                  <li>DS-002 Loan portfolio — average balances</li>
                  <li>DS-010 Curated credit dataset — segment mix</li>
                  {wBench === "peer" && (
                    <li>DS-011 Competitor metrics — 3 of 5 peers have permitted data</li>
                  )}
                </ul>
              )}
              {step === 4 && (
                <ul className="space-y-1.5">
                  <li className="text-xs text-muted-foreground">
                    These results are fixed in this demo, not computed from the sources.
                  </li>
                  {[
                    ["Source identity & provenance", true],
                    ["Access permissions", true],
                    ["Period / currency / units aligned", wBench !== "peer"],
                    ["Completeness & freshness", true],
                    ["Reconciled to GL controls", false],
                  ].map(([l, ok]) => (
                    <li key={String(l)} className="flex items-center gap-2">
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-warning" />
                      )}
                      {l as string}
                      {!ok && (
                        <span className="text-xs text-muted-foreground">
                          —{" "}
                          {l === "Reconciled to GL controls"
                            ? "DQ-101 open"
                            : "Ironwood 9M annualized; Cascade includes leasing"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {step === 5 && (
                <>
                  <Waterfall bridge={wb} height={200} />
                  <p className="num text-xs">
                    Gap {fmtM(wr.gap)} · Σ {fmtM(wr.explained)} ·{" "}
                    {wr.reconciles ? "reconciles" : "does not reconcile"}
                  </p>
                </>
              )}
              {step === 6 && (
                <ol className="list-decimal pl-4">
                  {[...wb.steps]
                    .sort((x, y) => Math.abs(y.value) - Math.abs(x.value))
                    .map((s) => (
                      <li key={s.label}>
                        {s.label}: <span className="num">{fmtM(s.value)}</span>{" "}
                        {s.kind === "residual" && "(unexplained)"}
                      </li>
                    ))}
                </ol>
              )}
              {step === 7 && (
                <ul className="space-y-2">
                  {INVESTIGATIONS[0]!.findings.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-2">
                      <span>
                        <StatusBadge
                          value={f.kind}
                          tone={f.kind === "Measured" ? "info" : "neutral"}
                          icon={false}
                        />{" "}
                        {f.claim}
                      </span>
                      <EvidenceBadge state={f.state} />
                    </li>
                  ))}
                </ul>
              )}
              {step === 8 && (
                <ul className="list-disc pl-4">
                  {INVESTIGATIONS[0]!.contradictions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {step === 9 &&
                (createdId ? (
                  <p>
                    Investigation{" "}
                    <Link
                      to="/investigations/$id"
                      params={{ id: createdId }}
                      className="text-primary underline"
                    >
                      {createdId}
                    </Link>{" "}
                    created.{" "}
                    <Link
                      to="/reports/$id"
                      params={{ id: "RPT-FY25-PERF" }}
                      className="text-primary underline"
                    >
                      Preview linked report
                    </Link>
                    .
                  </p>
                ) : (
                  <Button onClick={finish}>Create investigation</Button>
                ))}
              {step === 10 && (
                <div className="space-y-2">
                  <p>Corrective actions are assigned from findings on the investigation page.</p>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/investigations/$id",
                        params: { id: createdId ?? "INV-2025-014" },
                      })
                    }
                  >
                    Open investigation
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-between border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <Button
                size="sm"
                disabled={step === STEPS.length - 1 || (step === 9 && !createdId)}
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
