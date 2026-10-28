import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  DATASETS,
  DQ_DIMENSIONS,
  DQ_TREND,
  GLOSSARY,
  LINEAGE_EDGES,
  LINEAGE_NODES,
  type Dataset,
  type LineageNode,
} from "@/data/datasets";
import { DataTable, FilterSelect, type Column } from "@/components/DataTable";
import {
  axisProps,
  CHART,
  Field,
  Kpi,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
  tooltipStyle,
} from "@/components/kit";
import { ChartFrame } from "@/components/charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { actions, useStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data Intelligence Center — BankIntelli" },
      {
        name: "description",
        content: "Enterprise data catalog, lineage, data quality and governance workflows.",
      },
      { property: "og:title", content: "Data Intelligence Center — BankIntelli" },
      {
        property: "og:description",
        content: "Enterprise data catalog, lineage, data quality and governance workflows.",
      },
    ],
  }),
  component: DataPage,
});

const STEWARDS = ["G. Rossi", "F. Osei", "I. Novak", "Y. Tanaka", "B. Kowalski"];

function DataPage() {
  const cert = useStore((s) => s.certification);
  const issues = useStore((s) => s.issues);
  const reqs = useStore((s) => s.accessRequests);
  const [domain, setDomain] = useState("All");
  const [certF, setCertF] = useState("All");
  const [ds, setDs] = useState<Dataset | null>(null);
  const [node, setNode] = useState<LineageNode>(LINEAGE_NODES[4]!);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [purpose, setPurpose] = useState("");
  const issue = issues.find((i) => i.id === issueId);

  const rows = useMemo(
    () =>
      DATASETS.filter(
        (d) =>
          (domain === "All" || d.domain === domain) && (certF === "All" || cert[d.id] === certF),
      ),
    [domain, certF, cert],
  );

  const cols: Column<Dataset>[] = [
    { key: "id", header: "ID", cell: (d) => <span className="num text-xs">{d.id}</span> },
    {
      key: "name",
      header: "Dataset",
      cell: (d) => (
        <div>
          <div className="font-medium">{d.name}</div>
          <div className="text-xs text-muted-foreground">{d.system}</div>
        </div>
      ),
    },
    { key: "domain", header: "Domain" },
    { key: "owner", header: "Owner" },
    { key: "classification", header: "Class." },
    { key: "frequency", header: "Refresh" },
    { key: "quality", header: "Quality*", align: "right", cell: (d) => d.quality.toFixed(1) },
    {
      key: "cert",
      header: "Certification",
      value: (d) => cert[d.id] ?? "Unavailable",
      cell: (d) => <StatusBadge value={cert[d.id] ?? "Unavailable"} />,
    },
  ];

  const upstream = (id: string): string[] =>
    LINEAGE_EDGES.filter(([, t]) => t === id).flatMap(([s]) => [s, ...upstream(s)]);
  const downstream = (id: string): string[] =>
    LINEAGE_EDGES.filter(([s]) => s === id).flatMap(([, t]) => [t, ...downstream(t)]);
  const up = new Set(upstream(node.id));
  const down = new Set(downstream(node.id));
  const pos = (n: LineageNode) => ({ x: 20 + n.col * 170, y: 30 + n.row * 110 });

  const measurable = DQ_DIMENSIONS.filter((d) => d.score !== null);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Governance & Data Intelligence"
        description="Catalog, lineage and data quality for datasets that feed reports and models. Lineage is illustrative, not harvested from live systems."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Catalogued datasets"
          value={String(DATASETS.length)}
          definition="Datasets registered in the catalog."
          period="As of 14 Jan 2026"
        />
        <Kpi
          label="Certified"
          value={String(Object.values(cert).filter((c) => c === "Certified").length)}
          definition="Datasets certified by owner and steward."
          period="As of 14 Jan 2026"
        />
        <Kpi
          label="Open DQ issues"
          value={String(issues.filter((i) => i.status !== "Resolved").length)}
          definition="Failed quality rules not yet resolved."
          period="As of 14 Jan 2026"
        />
        <Kpi
          label="Avg quality score"
          value={(measurable.reduce((a, d) => a + d.score!, 0) / measurable.length).toFixed(1)}
          sub="simulated"
          definition="Mean of measurable dimension scores. Simulated, not a real bank measurement."
          period="Week 02"
        />
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
          <TabsTrigger value="quality">Data quality</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <DataTable
            rows={rows}
            columns={cols}
            rowKey={(d) => d.id}
            exportName="data-catalog"
            onRowClick={setDs}
            selectedKey={ds?.id}
            toolbar={
              <>
                <FilterSelect
                  label="Domain"
                  value={domain}
                  options={[...new Set(DATASETS.map((d) => d.domain))]}
                  onChange={setDomain}
                />
                <FilterSelect
                  label="Certification"
                  value={certF}
                  options={["Certified", "Pending", "Not certified", "Revoked"]}
                  onChange={setCertF}
                />
              </>
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">
            *Quality scores are simulated for demonstration.
          </p>
        </TabsContent>

        <TabsContent value="lineage" className="mt-4 grid gap-4 xl:grid-cols-3">
          <Panel
            title="Lineage explorer"
            subtitle="Illustrative dataset-level lineage · click a node"
            className="xl:col-span-2"
            bodyClass="overflow-x-auto"
          >
            <svg width={1040} height={260} role="img" aria-label="Data lineage graph">
              {LINEAGE_EDGES.map(([s, t]) => {
                const a = pos(LINEAGE_NODES.find((n) => n.id === s)!),
                  b = pos(LINEAGE_NODES.find((n) => n.id === t)!);
                const hot =
                  ((s === node.id || up.has(s)) && (t === node.id || up.has(t))) ||
                  ((s === node.id || down.has(s)) && down.has(t));
                return (
                  <path
                    key={s + t}
                    d={`M${a.x + 140},${a.y + 22} C${a.x + 160},${a.y + 22} ${b.x - 20},${b.y + 22} ${b.x},${b.y + 22}`}
                    fill="none"
                    stroke={hot ? "var(--primary)" : "var(--border)"}
                    strokeWidth={hot ? 2 : 1.5}
                  />
                );
              })}
              {LINEAGE_NODES.map((n) => {
                const p = pos(n);
                const sel = n.id === node.id;
                const rel = up.has(n.id) || down.has(n.id);
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x},${p.y})`}
                    onClick={() => setNode(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setNode(n);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Show lineage for ${n.label}`}
                    aria-pressed={sel}
                    className="cursor-pointer"
                  >
                    <rect
                      width={140}
                      height={44}
                      rx={5}
                      fill={sel ? "var(--ink)" : "var(--card)"}
                      stroke={sel ? "var(--ink)" : rel ? "var(--primary)" : "var(--border)"}
                      strokeWidth={1.5}
                    />
                    <text
                      x={10}
                      y={18}
                      fontSize={10}
                      fill={sel ? "var(--cyan)" : "var(--muted-foreground)"}
                      style={{ textTransform: "uppercase", letterSpacing: 1 }}
                    >
                      {n.type}
                    </text>
                    <text
                      x={10}
                      y={34}
                      fontSize={12}
                      fontWeight={600}
                      fill={sel ? "var(--ink-foreground)" : "var(--foreground)"}
                    >
                      {n.label}
                    </text>
                    {n.issues.length > 0 && (
                      <circle cx={130} cy={10} r={4} fill="var(--critical)" />
                    )}
                  </g>
                );
              })}
            </svg>
          </Panel>
          <Panel title={node.label} subtitle={`${node.type} · ${node.ref ?? "no catalog ref"}`}>
            <dl className="space-y-3">
              <Field label="Owner">{node.owner}</Field>
              <Field label="Last refresh">{node.refresh}</Field>
              <Field label="Transformation">{node.transform}</Field>
              <Field label="Upstream">
                {[...up].map((u) => LINEAGE_NODES.find((n) => n.id === u)!.label).join(", ") || "—"}
              </Field>
              <Field label="Downstream / impacted">
                {[...down].map((u) => LINEAGE_NODES.find((n) => n.id === u)!.label).join(", ") ||
                  "—"}
              </Field>
              <Field label="Quality issues">
                {node.issues.length
                  ? node.issues.map((i) => (
                      <StatusBadge key={i} value={i} tone="critical" className="mr-1" />
                    ))
                  : "None"}
              </Field>
            </dl>
            {node.ref?.startsWith("DS-") && DATASETS.find((d) => d.id === node.ref)?.columns && (
              <div className="mt-4">
                <p className="eyebrow mb-1">Column-level lineage</p>
                <ul className="space-y-1 text-xs">
                  {DATASETS.find((d) => d.id === node.ref)!.columns!.map((c) => (
                    <li key={c.name} className="flex justify-between gap-2">
                      <span className="num">
                        {c.name}
                        {c.cde && <span className="ml-1 text-primary">CDE</span>}
                      </span>
                      <span className="num text-muted-foreground">← {c.source}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="quality" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Dimension scores" subtitle="Simulated">
              <ul className="space-y-2 text-sm">
                {DQ_DIMENSIONS.map((d) => (
                  <li key={d.dimension}>
                    <div className="flex justify-between">
                      <span>{d.dimension}</span>
                      <span className="num">
                        {d.score === null ? "Not measurable" : d.score.toFixed(1)}
                      </span>
                    </div>
                    {d.score !== null && (
                      <div className="mt-1 h-1.5 rounded bg-muted">
                        <div
                          className={cn(
                            "h-1.5 rounded",
                            d.score > 97
                              ? "bg-success"
                              : d.score > 94
                                ? "bg-primary"
                                : "bg-warning",
                          )}
                          style={{ width: `${d.score}%` }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Accuracy requires an independent reference source not available in this POC.
              </p>
            </Panel>
            <ChartFrame
              title="Quality score trend"
              description="Average data-quality score across catalogued datasets"
              unit="Score out of 100 (simulated)"
              period={`${DQ_TREND[0]?.week ?? "?"} to ${DQ_TREND.at(-1)?.week ?? "?"}`}
              source="Simulated quality checks (demo data)"
              rows={DQ_TREND}
              columns={[
                { key: "week", header: "Week" },
                { key: "score", header: "Score" },
              ]}
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={DQ_TREND}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="week" {...axisProps} />
                  <YAxis {...axisProps} domain={[92, 97]} width={35} />
                  <Tooltip {...tooltipStyle} />
                  <Line dataKey="score" stroke={CHART.c1} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
          <Panel title="Failed rules & issues" bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-caption uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Issue</th>
                    <th className="px-3 py-2">Dimension</th>
                    <th className="px-3 py-2 text-right">Affected</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i) => (
                    <tr
                      key={i.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-accent/50"
                      tabIndex={0}
                      onClick={() => {
                        setIssueId(i.id);
                        setResolution(i.resolution ?? "");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setIssueId(i.id);
                          setResolution(i.resolution ?? "");
                        }
                      }}
                    >
                      <td className="num px-3 py-2 text-xs">{i.id}</td>
                      <td className="px-3 py-2">
                        {i.title}
                        <div className="text-xs text-muted-foreground">{i.dataset}</div>
                      </td>
                      <td className="px-3 py-2">{i.dimension}</td>
                      <td className="num px-3 py-2 text-right">{i.affected.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <StatusBadge value={i.severity} />
                      </td>
                      <td className="px-3 py-2">{i.owner}</td>
                      <td className="px-3 py-2">
                        <StatusBadge value={i.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="governance" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Business glossary & critical data elements">
            <ul className="divide-y text-sm">
              {GLOSSARY.map((g) => (
                <li key={g.term} className="py-2">
                  <div className="flex justify-between">
                    <b>{g.term}</b>
                    {g.cde && <StatusBadge value="CDE" tone="info" icon={false} />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {g.definition} · Owner {g.owner}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Data access requests" subtitle="Simulated workflow">
            <ul className="divide-y text-sm">
              {reqs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="num text-xs text-muted-foreground">{r.id}</span> {r.requester}{" "}
                    → {r.dataset}
                    <div className="text-xs text-muted-foreground">{r.purpose}</div>
                  </span>
                  {r.status === "Pending" ? (
                    <span className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actions.decideAccess(r.id, "Approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actions.decideAccess(r.id, "Rejected")}
                      >
                        Reject
                      </Button>
                    </span>
                  ) : (
                    <StatusBadge value={r.status} />
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>

      <Sheet open={!!ds} onOpenChange={(o) => !o && setDs(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {ds && (
            <>
              <SheetHeader>
                <SheetTitle>{ds.name}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {ds.id} · {ds.description}
                </p>
              </SheetHeader>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Domain">{ds.domain}</Field>
                <Field label="System of record">{ds.system}</Field>
                <Field label="Owner">{ds.owner}</Field>
                <Field label="Steward">{ds.steward}</Field>
                <Field label="Classification">{ds.classification}</Field>
                <Field label="Sensitivity">{ds.sensitivity}</Field>
                <Field label="Frequency">{ds.frequency}</Field>
                <Field label="Last refresh">
                  <span className="num">{ds.lastRefresh}</span>
                </Field>
                <Field label="Retention">{ds.retention}</Field>
                <Field label="Quality (sim.)">{ds.quality}</Field>
              </dl>
              <div className="mt-4">
                <p className="eyebrow mb-1">Downstream</p>
                <div className="flex flex-wrap gap-1">
                  {ds.downstream.map((d) => (
                    <StatusBadge key={d} value={d} tone="info" icon={false} />
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <p className="eyebrow mb-1">Certification</p>
                <div className="flex items-center gap-2">
                  <StatusBadge value={cert[ds.id] ?? "Unavailable"} />
                  <select
                    aria-label="Change certification"
                    className="h-8 rounded-md border bg-card px-2 text-sm"
                    value={cert[ds.id]}
                    onChange={(e) => {
                      actions.setCertification(ds.id, e.target.value as "Certified");
                      toast.success("Certification updated");
                    }}
                  >
                    <option>Certified</option>
                    <option>Pending</option>
                    <option>Not certified</option>
                    <option>Revoked</option>
                  </select>
                </div>
                {issues.some(
                  (i) =>
                    i.dataset === ds.id && i.status !== "Resolved" && i.severity === "Critical",
                ) && (
                  <div className="mt-2">
                    <Notice tone="warning">
                      A critical open issue exists on this dataset — certification should be
                      withheld.
                    </Notice>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="eyebrow mb-1">Request access</p>
                <Input
                  aria-label="Business purpose for access"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Business purpose"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={!purpose.trim()}
                  onClick={() => {
                    actions.requestAccess(ds.id, purpose);
                    setPurpose("");
                    toast.success("Access request submitted (simulated)");
                  }}
                >
                  Submit request
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!issue} onOpenChange={(o) => !o && setIssueId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {issue && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {issue.id} · {issue.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex gap-2">
                  <StatusBadge value={issue.severity} />
                  <StatusBadge value={issue.status} />
                </div>
                <Field label="Rule">
                  <code className="num rounded bg-muted px-1.5 py-0.5 text-xs">{issue.rule}</code>
                </Field>
                <Field label="Detail">{issue.detail}</Field>
                <Field label="Affected records">
                  <span className="num">{issue.affected.toLocaleString()}</span>
                </Field>
                <Field label="Dataset">
                  {issue.dataset} —{" "}
                  <Link to="/data" className="text-primary">
                    {DATASETS.find((d) => d.id === issue.dataset)?.name}
                  </Link>
                </Field>
                <label className="block text-xs text-muted-foreground">
                  Assign data owner
                  <select
                    className="mt-1 block h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground"
                    value={issue.owner}
                    onChange={(e) =>
                      actions.updateIssue(issue.id, {
                        owner: e.target.value,
                        status: issue.status === "Open" ? "Assigned" : issue.status,
                      })
                    }
                  >
                    <option>Unassigned</option>
                    {STEWARDS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-muted-foreground">
                  Resolution
                  <Textarea
                    className="mt-1"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Describe the fix and evidence…"
                  />
                </label>
                <Button
                  disabled={
                    !resolution.trim() ||
                    issue.owner === "Unassigned" ||
                    issue.status === "Resolved"
                  }
                  onClick={() => {
                    actions.updateIssue(issue.id, { status: "Resolved", resolution });
                    toast.success(`${issue.id} resolved`);
                  }}
                >
                  Record resolution
                </Button>
                {issue.owner === "Unassigned" && (
                  <p className="text-xs text-muted-foreground">Assign an owner first.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
