import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  CHANNELS,
  CREDIT_TREND,
  FUNNEL,
  INDUSTRIES,
  PRODUCTS,
  REGIONS,
  REJECTION_REASONS,
  RISK_BANDS,
  SEGMENTS,
  SLICES,
  STRESS,
} from "@/data/credit";
import { FilterSelect } from "@/components/DataTable";
import {
  axisProps,
  CHART,
  Kpi,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
  tooltipStyle,
} from "@/components/kit";
import { Button } from "@/components/ui/button";
import { downloadFile, fmtM, fmtPct, growth, pct, sum } from "@/lib/calc";

export const Route = createFileRoute("/credit")({
  head: () => ({
    meta: [
      { title: "AI Credit Intelligence — BankIntelli" },
      {
        name: "description",
        content:
          "Credit portfolio performance, lifecycle funnel, risk monitoring and revenue investigation.",
      },
      { property: "og:title", content: "AI Credit Intelligence — BankIntelli" },
      {
        property: "og:description",
        content:
          "Credit portfolio performance, lifecycle funnel, risk monitoring and revenue investigation.",
      },
    ],
  }),
  component: CreditPage,
});

function CreditPage() {
  const [segment, setSegment] = useState("All");
  const [product, setProduct] = useState("All");
  const [region, setRegion] = useState("All");
  const [band, setBand] = useState("All");
  const [channel, setChannel] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [dim, setDim] = useState<"segment" | "product" | "riskBand" | "region">("segment");
  const [stress, setStress] = useState(0);

  const rows = useMemo(
    () =>
      SLICES.filter(
        (s) =>
          (segment === "All" || s.segment === segment) &&
          (product === "All" || s.product === product) &&
          (region === "All" || s.region === region) &&
          (band === "All" || s.riskBand === band) &&
          (channel === "All" || s.channel === channel) &&
          (industry === "All" || s.industry === industry),
      ),
    [segment, product, region, band, channel, industry],
  );

  const bal = sum(rows.map((r) => r.balance));
  const prior = sum(rows.map((r) => r.priorBalance));
  const rev = sum(rows.map((r) => r.revenue));
  const npl = sum(rows.map((r) => r.npl));
  const ecl = sum(rows.map((r) => r.ecl));
  const orig = sum(rows.map((r) => r.originations));
  const wo = sum(rows.map((r) => r.writeOffs));
  const rec = sum(rows.map((r) => r.recoveries));
  const dpd = sum(rows.map((r) => r.dpd30));
  const lim = sum(rows.map((r) => r.limit));
  const coll = sum(rows.map((r) => r.collateral));
  const loans = sum(rows.map((r) => r.loans));
  const sc = STRESS[stress]!;

  const breakdown = Object.values(
    rows.reduce<Record<string, { key: string; balance: number; revenue: number; npl: number }>>(
      (acc, r) => {
        const k = r[dim];
        acc[k] ??= { key: k, balance: 0, revenue: 0, npl: 0 };
        acc[k].balance += r.balance;
        acc[k].revenue += r.revenue;
        acc[k].npl += r.npl;
        return acc;
      },
      {},
    ),
  ).map((x) => ({
    ...x,
    balance: +x.balance.toFixed(0),
    revenue: +x.revenue.toFixed(1),
    nplRatio: +pct(x.npl, x.balance).toFixed(2),
  }));

  const watch = [...rows].sort((a, b) => b.npl / b.balance - a.npl / a.balance).slice(0, 6);
  const products =
    segment === "All" ? Object.values(PRODUCTS).flat() : PRODUCTS[segment as keyof typeof PRODUCTS];

  const report = () => {
    const md = `# Credit performance report (synthetic)\n\nScope: segment=${segment}, product=${product}, region=${region}, band=${band}, channel=${channel}, industry=${industry} · FY2025 · USD M\n\n| Measure | Type | Value |\n|---|---|---|\n| Outstanding balance | Balance | ${bal.toFixed(1)} |\n| Balance growth | Ratio | ${growth(bal, prior).toFixed(1)}% |\n| Originations | Flow | ${orig.toFixed(1)} |\n| Interest & fee revenue | Flow | ${rev.toFixed(1)} |\n| NPL ratio | Ratio | ${pct(npl, bal).toFixed(2)}% |\n| ECL (model output) | Accounting | ${ecl.toFixed(1)} |\n| Net write-offs | Flow | ${(wo - rec).toFixed(1)} |\n\nNot for production credit decisions.\n`;
    downloadFile("credit-performance-report.md", md, "text/markdown");
    toast.success("Credit performance report generated");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Credit Intelligence"
        description="Portfolio performance, revenue and credit quality. Not approved for production underwriting decisions."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={report}>
              <Download className="h-3.5 w-3.5" /> Generate report
            </Button>
            <Button size="sm" asChild>
              <Link to="/investigations/$id" params={{ id: "INV-2025-014" }}>
                Investigate revenue gap
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-3 rounded-md border bg-card p-3">
        <FilterSelect
          label="Segment"
          value={segment}
          options={[...SEGMENTS]}
          onChange={(v) => {
            setSegment(v);
            setProduct("All");
          }}
        />
        <FilterSelect label="Product" value={product} options={products} onChange={setProduct} />
        <FilterSelect label="Region" value={region} options={[...REGIONS]} onChange={setRegion} />
        <FilterSelect label="Risk band" value={band} options={[...RISK_BANDS]} onChange={setBand} />
        <FilterSelect
          label="Channel"
          value={channel}
          options={[...CHANNELS]}
          onChange={setChannel}
        />
        <FilterSelect
          label="Industry"
          value={industry}
          options={INDUSTRIES}
          onChange={setIndustry}
        />
        <span className="ml-auto self-center text-xs text-muted-foreground">
          Currency: USD · Period: FY2025 · {rows.length} portfolio slices
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Kpi
          label="Outstanding balance"
          value={fmtM(bal, 0)}
          delta={`${growth(bal, prior).toFixed(1)}% YoY`}
          deltaGood
          sub="balance"
          definition="Stock of outstanding principal at period end."
          period="31 Dec 2025"
        />
        <Kpi
          label="New originations"
          value={fmtM(orig, 0)}
          sub="flow"
          definition="Principal disbursed during the year."
        />
        <Kpi
          label="Interest & fee revenue"
          value={fmtM(rev)}
          sub="flow"
          definition="Interest and fee income recognized in the year."
        />
        <Kpi
          label="NPL ratio"
          value={fmtPct(pct(npl, bal), 2)}
          sub="ratio"
          definition="Non-performing balance ÷ outstanding balance (observed)."
          period="31 Dec 2025"
        />
        <Kpi
          label="30+ DPD rate"
          value={fmtPct(pct(dpd, bal), 2)}
          sub="ratio"
          definition="Balance 30+ days past due ÷ balance."
          period="31 Dec 2025"
        />
        <Kpi
          label="Expected credit loss"
          value={fmtM(ecl)}
          sub="model output"
          definition="IFRS 9 ECL stock — model estimate, not observed loss."
          period="31 Dec 2025"
        />
        <Kpi
          label="Net write-offs"
          value={fmtM(wo - rec)}
          sub={`WO ${wo.toFixed(1)} · Rec ${rec.toFixed(1)}`}
          definition="Write-offs less recoveries (observed flow)."
        />
        <Kpi
          label="Approval rate"
          value={fmtPct(pct(FUNNEL[3]!.count, FUNNEL[0]!.count))}
          definition="Approvals ÷ applications (bank-wide)."
        />
        <Kpi
          label="App → disbursement"
          value={fmtPct(pct(FUNNEL[6]!.count, FUNNEL[0]!.count))}
          definition="Disbursements ÷ applications."
        />
        <Kpi
          label="Avg loan size"
          value={`$${((bal * 1e6) / Math.max(loans, 1) / 1000).toFixed(1)}k`}
          definition="Balance ÷ number of loans."
          period="31 Dec 2025"
        />
        <Kpi
          label="Limit utilization"
          value={fmtPct(pct(bal, lim))}
          definition="Balance ÷ committed limits."
          period="31 Dec 2025"
        />
        <Kpi
          label="Collateral coverage"
          value={fmtPct(pct(coll, bal), 0)}
          definition="Collateral value ÷ balance (simulated valuations)."
          period="31 Dec 2025"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Breakdown"
          subtitle="Balance (USD M) and NPL ratio"
          className="xl:col-span-2"
          actions={
            <select
              aria-label="Breakdown dimension"
              className="h-8 rounded-md border bg-card px-2 text-xs"
              value={dim}
              onChange={(e) => setDim(e.target.value as "segment")}
            >
              <option value="segment">Segment</option>
              <option value="product">Product</option>
              <option value="riskBand">Risk band</option>
              <option value="region">Region</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={breakdown}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="key" {...axisProps} interval={0} />
              <YAxis yAxisId="l" {...axisProps} width={50} />
              <YAxis yAxisId="r" orientation="right" {...axisProps} width={35} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="balance" name="Balance" fill={CHART.c1} />
              <Bar yAxisId="r" dataKey="nplRatio" name="NPL %" fill={CHART.c4} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Credit revenue trend" subtitle="Quarterly, bank-wide · USD M">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={CREDIT_TREND}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="q" {...axisProps} />
              <YAxis {...axisProps} domain={["auto", "auto"]} width={35} />
              <Tooltip {...tooltipStyle} />
              <Line dataKey="revenue" stroke={CHART.c1} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Credit lifecycle funnel" subtitle="FY2025 applications · bank-wide">
          <ul className="space-y-1.5">
            {FUNNEL.map((f, i) => (
              <li
                key={f.stage}
                className="grid grid-cols-[140px_1fr_110px] items-center gap-2 text-xs"
              >
                <span>{f.stage}</span>
                <div className="h-5 rounded bg-muted">
                  <div
                    className="h-5 rounded bg-primary/80"
                    style={{ width: `${pct(f.count, FUNNEL[0]!.count)}%` }}
                  />
                </div>
                <span className="num text-right">
                  {f.count.toLocaleString()}{" "}
                  {i > 0 && (
                    <span className="text-muted-foreground">
                      ({pct(f.count, FUNNEL[i - 1]!.count).toFixed(0)}%)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="eyebrow mt-4 mb-1">Rejection reasons</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {REJECTION_REASONS.map((r) => (
              <span key={r.reason} className="rounded border px-2 py-1">
                {r.reason} <b className="num">{r.share}%</b>
              </span>
            ))}
          </div>
        </Panel>
        <Panel
          title="Stress scenarios"
          subtitle="Illustrative multipliers on model ECL"
          actions={
            <select
              aria-label="Scenario"
              className="h-8 rounded-md border bg-card px-2 text-xs"
              value={stress}
              onChange={(e) => setStress(+e.target.value)}
            >
              {STRESS.map((s, i) => (
                <option key={s.scenario} value={i}>
                  {s.scenario}
                </option>
              ))}
            </select>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Kpi
              label="Stressed ECL"
              value={fmtM(ecl * sc.eclMultiplier)}
              delta={`×${sc.eclMultiplier}`}
              definition="Model ECL × scenario multiplier (illustrative)."
            />
            <Kpi
              label="Stressed NPL ratio"
              value={fmtPct(pct(npl, bal) + sc.nplShift, 2)}
              delta={`+${sc.nplShift}pp`}
              definition="Observed NPL ratio + scenario shift."
            />
          </div>
          <div className="mt-3">
            <Notice>
              Stress outputs are simulated model projections and are distinguished from observed
              outcomes.
            </Notice>
          </div>
        </Panel>
      </div>

      <Panel title="Watchlist — highest NPL ratio slices" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-caption uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Slice</th>
                <th className="px-3 py-2">Segment / product</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Band</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">NPL %</th>
                <th className="px-3 py-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {watch.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="num px-3 py-2 text-xs">{w.id}</td>
                  <td className="px-3 py-2">
                    {w.segment} · {w.product}
                  </td>
                  <td className="px-3 py-2">{w.region}</td>
                  <td className="px-3 py-2">{w.riskBand}</td>
                  <td className="num px-3 py-2 text-right">{w.balance.toFixed(0)}</td>
                  <td className="num px-3 py-2 text-right">{pct(w.npl, w.balance).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={w.riskBand === "D" ? "High" : "Watch"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
