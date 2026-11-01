import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DataTable, FilterSelect, type Column } from "@/components/DataTable";
import { EvidenceBadge, PageHeader, Panel, StatusBadge } from "@/components/kit";
import { REPORTS, type Action, type Investigation } from "@/data/investigations";
import { actions, useStore } from "@/store/app-store";

export const Route = createFileRoute("/investigations/")({
  head: () => ({
    meta: [
      { title: "Investigations & Reports — BankIntelli" },
      { name: "description", content: "Investigation register, action tracking and report library." },
      { property: "og:title", content: "Investigations & Reports — BankIntelli" },
      { property: "og:description", content: "Investigation register, action tracking and report library." },
    ],
  }),
  component: InvPage,
});

function InvPage() {
  const navigate = useNavigate();
  const invs = useStore((s) => s.investigations);
  const acts = useStore((s) => s.actions);
  const [status, setStatus] = useState("All");
  const [prio, setPrio] = useState("All");
  const [aStatus, setAStatus] = useState("All");
  const rows = useMemo(() => invs.filter((i) => (status === "All" || i.status === status) && (prio === "All" || i.priority === prio)), [invs, status, prio]);
  const arows = useMemo(() => acts.filter((a) => aStatus === "All" || a.status === aStatus), [acts, aStatus]);

  const cols: Column<Investigation>[] = [
    { key: "id", header: "ID", cell: (i) => <span className="num text-xs">{i.id}</span> },
    { key: "title", header: "Title", cell: (i) => <span className="font-medium">{i.title}</span> },
    { key: "department", header: "Department" },
    { key: "owner", header: "Owner" },
    { key: "created", header: "Created", cell: (i) => <span className="num text-xs">{i.created}</span> },
    { key: "period", header: "Period" },
    { key: "priority", header: "Priority", cell: (i) => <StatusBadge value={i.priority} /> },
    { key: "status", header: "Status", cell: (i) => <StatusBadge value={i.status} /> },
    { key: "state", header: "Verification", cell: (i) => <EvidenceBadge state={i.state} /> },
    { key: "report", header: "Report", value: (i) => i.report ?? "—" },
    { key: "outstanding", header: "Open issues", align: "right" },
  ];

  const acols: Column<Action>[] = [
    { key: "id", header: "ID", cell: (a) => <span className="num text-xs">{a.id}</span> },
    { key: "action", header: "Action" },
    { key: "finding", header: "Finding", cell: (a) => <span className="num text-xs">{a.finding}</span> },
    { key: "owner", header: "Owner" },
    { key: "due", header: "Due", cell: (a) => <span className="num text-xs">{a.due}</span> },
    { key: "priority", header: "Priority", cell: (a) => <StatusBadge value={a.priority} /> },
    { key: "status", header: "Status", cell: (a) => (
      <select aria-label="Action status" className="h-7 rounded border bg-card px-1 text-xs" value={a.status} onClick={(e) => e.stopPropagation()} onChange={(e) => actions.updateAction(a.id, { status: e.target.value as Action["status"], ...(e.target.value === "Done" ? { evidence: "Marked complete (demo)" } : {}) })}>
        <option>Open</option><option>In Progress</option><option>Done</option>
      </select>) },
    { key: "outcome", header: "Expected outcome", cell: (a) => <span className="text-xs">{a.outcome}</span> },
    { key: "evidence", header: "Completion evidence", value: (a) => a.evidence ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Investigations & Reports" description="Shared evidence and investigation framework across all modules." />
      <DataTable rows={rows} columns={cols} rowKey={(i) => i.id} exportName="investigations" onRowClick={(i) => navigate({ to: "/investigations/$id", params: { id: i.id } })}
        toolbar={<><FilterSelect label="Status" value={status} options={["Draft", "In Progress", "Pending Review", "Approved", "Closed"]} onChange={setStatus} /><FilterSelect label="Priority" value={prio} options={["Critical", "High", "Medium", "Low"]} onChange={setPrio} /></>} />
      <div>
        <h2 className="mb-2 text-sm font-semibold">Action register</h2>
        <DataTable rows={arows} columns={acols} rowKey={(a) => a.id} exportName="actions" toolbar={<FilterSelect label="Status" value={aStatus} options={["Open", "In Progress", "Done"]} onChange={setAStatus} />} />
      </div>
      <Panel title="Report library">
        <ul className="divide-y">{REPORTS.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <Link to="/reports/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.title}</Link>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">{r.owner} · {r.period} · updated {r.updated} <EvidenceBadge state={r.state} /></span>
          </li>))}
        </ul>
      </Panel>
    </div>
  );
}
