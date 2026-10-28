import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { MODELS, type Model } from "@/data/models";
import { DataTable, FilterSelect, type Column } from "@/components/DataTable";
import { Kpi, PageHeader, Panel, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/app-store";
import { downloadFile, toCSV } from "@/lib/calc";

export const Route = createFileRoute("/models/")({
  head: () => ({
    meta: [
      { title: "Model Intelligence Center — BankIntelli" },
      { name: "description", content: "Model inventory, monitoring, drift alerts and governance workflows." },
      { property: "og:title", content: "Model Intelligence Center — BankIntelli" },
      { property: "og:description", content: "Model inventory, monitoring, drift alerts and governance workflows." },
    ],
  }),
  component: ModelsPage,
});

const TODAY = "2026-01-14";

function ModelsPage() {
  const navigate = useNavigate();
  const lifecycle = useStore((s) => s.modelLifecycle);
  const drift = useStore((s) => s.driftAlerts);
  const [tier, setTier] = useState("All");
  const [dept, setDept] = useState("All");
  const [sev, setSev] = useState("All");
  const [st, setSt] = useState("All");

  const rows = useMemo(() => MODELS.filter((m) => (tier === "All" || m.riskTier === tier) && (dept === "All" || m.department === dept)), [tier, dept]);
  const alerts = drift.filter((a) => (sev === "All" || a.severity === sev) && (st === "All" || a.status === st));

  const cols: Column<Model>[] = [
    { key: "id", header: "ID", cell: (m) => <span className="num text-xs">{m.id}</span> },
    { key: "name", header: "Model", cell: (m) => <div><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.algorithm}</div></div> },
    { key: "department", header: "Department" },
    { key: "kind", header: "Type" },
    { key: "version", header: "Version", cell: (m) => <span className="num text-xs">{m.version}</span> },
    { key: "environment", header: "Env", cell: (m) => <StatusBadge value={m.environment} icon={false} /> },
    { key: "lifecycle", header: "Lifecycle", value: (m) => lifecycle[m.id] ?? "Unavailable", cell: (m) => <StatusBadge value={lifecycle[m.id] ?? "Unavailable"} /> },
    { key: "riskTier", header: "Risk tier" },
    { key: "nextReview", header: "Next review", cell: (m) => <span className={m.nextReview < TODAY ? "num font-medium text-critical" : "num"}>{m.nextReview}{m.nextReview < TODAY && " · overdue"}</span> },
    { key: "health", header: "Health", cell: (m) => <StatusBadge value={m.health} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI, Machine Learning & Model Governance"
        description="Registry, monitoring and model risk management for all AI/ML models in scope."
        actions={<Button variant="outline" size="sm" onClick={() => downloadFile("model-inventory.csv", toCSV(MODELS.map((m) => ({ id: m.id, name: m.name, owner: m.businessOwner, tier: m.riskTier, lifecycle: lifecycle[m.id], version: m.version, next_review: m.nextReview }))))}><Download className="h-3.5 w-3.5" /> Inventory report</Button>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Models in inventory" value={String(MODELS.length)} definition="Registered models across all environments." period="As of 14 Jan 2026" />
        <Kpi label="Tier 1 models" value={String(MODELS.filter((m) => m.riskTier === "Tier 1").length)} definition="Highest model risk tier requiring annual independent validation." period="As of 14 Jan 2026" />
        <Kpi label="Overdue reviews" value={String(MODELS.filter((m) => m.nextReview < TODAY).length)} definition="Models whose next review date has passed." period="As of 14 Jan 2026" />
        <Kpi label="Open alerts" value={String(drift.filter((d) => d.status !== "Closed").length)} definition="Drift or performance alerts not yet dispositioned." period="As of 14 Jan 2026" />
      </div>

      <DataTable
        rows={rows}
        columns={cols}
        rowKey={(m) => m.id}
        exportName="models"
        searchPlaceholder="Search models, owners…"
        onRowClick={(m) => navigate({ to: "/models/$id", params: { id: m.id } })}
        toolbar={<>
          <FilterSelect label="Tier" value={tier} options={["Tier 1", "Tier 2", "Tier 3"]} onChange={setTier} />
          <FilterSelect label="Department" value={dept} options={[...new Set(MODELS.map((m) => m.department))]} onChange={setDept} />
        </>}
      />

      <Panel title="Model alerts" actions={<div className="flex gap-2"><FilterSelect label="Severity" value={sev} options={["High", "Medium", "Low"]} onChange={setSev} /><FilterSelect label="Status" value={st} options={["Open", "Under assessment", "Closed"]} onChange={setSt} /></div>}>
        <ul className="divide-y">
          {alerts.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">No alerts match.</li>}
          {alerts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <Link to="/models/$id" params={{ id: a.model }} search={{ tab: "drift" }} className="hover:underline"><span className="num text-xs text-muted-foreground">{a.id}</span> {a.title}</Link>
              <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Owner: {a.owner}</span><StatusBadge value={a.severity} /><StatusBadge value={a.status} /></div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
