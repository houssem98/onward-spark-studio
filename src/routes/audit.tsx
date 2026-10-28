import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DataTable, FilterSelect, type Column } from "@/components/DataTable";
import { PageHeader } from "@/components/kit";
import { useStore, type AuditEvent } from "@/store/app-store";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — BankIntelli" },
      {
        name: "description",
        content: "Readable audit timeline of all decisions, assignments and status changes.",
      },
      { property: "og:title", content: "Audit Trail — BankIntelli" },
      {
        property: "og:description",
        content: "Readable audit timeline of all decisions, assignments and status changes.",
      },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const audit = useStore((s) => s.audit);
  const [mod, setMod] = useState("All");
  const rows = useMemo(() => audit.filter((a) => mod === "All" || a.module === mod), [audit, mod]);
  const cols: Column<AuditEvent>[] = [
    { key: "at", header: "Timestamp", cell: (a) => <span className="num text-xs">{a.at}</span> },
    { key: "actor", header: "Actor" },
    { key: "module", header: "Module" },
    {
      key: "entity",
      header: "Entity",
      cell: (a) => <span className="num text-xs">{a.entity}</span>,
    },
    {
      key: "action",
      header: "Action",
      cell: (a) => <span className="font-medium">{a.action}</span>,
    },
    { key: "detail", header: "Detail", cell: (a) => <span className="text-xs">{a.detail}</span> },
  ];
  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Trail & Activity"
        description="Every simulated change made in this session is recorded here, newest first. Session-only; not persisted."
      />
      <DataTable
        rows={rows}
        columns={cols}
        rowKey={(a) => a.id}
        exportName="audit-trail"
        pageSize={20}
        toolbar={
          <FilterSelect
            label="Module"
            value={mod}
            options={["Models", "Data", "Financial Crime", "Investigations"]}
            onChange={setMod}
          />
        }
      />
    </div>
  );
}
