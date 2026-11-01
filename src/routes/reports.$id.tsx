import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { REPORTS } from "@/data/investigations";
import { BRIDGES, DEPARTMENTS, PEERS, SCORECARD } from "@/data/finance";
import { EvidenceBadge, PageHeader, Panel, StatusBadge } from "@/components/kit";
import { Waterfall } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { actions, useStore } from "@/store/app-store";
import { costToIncome, downloadFile, fmtM, growth, pct, reconcileBridge, sum } from "@/lib/calc";

export const Route = createFileRoute("/reports/$id")({
  loader: ({ params }) => {
    const r = REPORTS.find((x) => x.id === params.id);
    if (!r) throw notFound();
    return { title: r.title };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Report"} — BankIntelli` },
      { name: "description", content: "Evidence-backed report with findings, calculations, verification results and sign-off." },
      { property: "og:title", content: `${loaderData?.title ?? "Report"} — BankIntelli` },
      { property: "og:description", content: "Evidence-backed report with findings, calculations, verification results and sign-off." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const r = REPORTS.find((x) => x.id === id)!;
  const inv = useStore((s) => s.investigations.find((i) => i.id === r.investigation))!;
  const acts = useStore((s) => s.actions.filter((a) => inv.findings.some((f) => f.id === a.finding)));
  const issues = useStore((s) => s.issues);
  const audit = useStore((s) => s.audit.filter((a) => a.entity === r.id || a.entity === inv.id));
  const [signoff, setSignoff] = useState<{ by: string; at: string; note: string } | null>(null);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const allVerified = inv.findings.every((f) => f.state === "VERIFIED");
  const state = allVerified && signoff ? "VERIFIED" : inv.findings.some((f) => f.state === "VERIFIED") ? "PARTIALLY_VERIFIED" : "UNVERIFIED";
  const bridge = BRIDGES[0];
  const rec = reconcileBridge(bridge);
  const a = SCORECARD.FY2025;
  const rev = a.nii + a.nonInterest;
  const opex = sum(DEPARTMENTS.map((d) => d.expenses));

  const sections = [
    { t: "1. Executive summary", c: <p>Credit revenue of {fmtM(120)} trailed the high-comparability peer benchmark of {fmtM(150)} by {fmtM(rec.gap)}. Measured volume, pricing and mix effects explain {fmtM(rec.explained - bridge.steps[3].value)}; {fmtM(bridge.steps[3].value)} remains unexplained. Overall verification: {state.replace("_", " ").toLowerCase()}.</p> },
    { t: "2. Scope and methodology", c: <p>{inv.department} · {inv.period} · USD M · IFRS basis (synthetic). Volume/price/mix decomposition against peer benchmark; deterministic arithmetic; LLM not used for values.</p> },
    { t: "3. KPI scorecard", c: <ul className="grid grid-cols-2 gap-1 md:grid-cols-4"><li>Operating income {fmtM(rev, 0)}</li><li>NIM {pct(a.nii, a.avgEarningAssets).toFixed(2)}%</li><li>CIR {costToIncome(opex, rev).toFixed(1)}%</li><li>ROE {pct(a.netIncome, a.avgEquity).toFixed(1)}%</li></ul> },
    { t: "4. Peer group and comparability", c: <ul className="list-disc pl-4">{PEERS.map((p) => <li key={p.id}>{p.name} — {p.source}, comparability {p.comparability}{p.warning ? ` (${p.warning})` : ""}</li>)}</ul> },
    { t: "5. Revenue and profitability trends", c: <p>Total operating income grew {growth(rev, SCORECARD.FY2024.nii + SCORECARD.FY2024.nonInterest).toFixed(1)}% YoY; credit revenue grew {growth(120, 114).toFixed(1)}%.</p> },
    { t: "6. Variance decomposition", c: <Waterfall bridge={bridge} height={220} /> },
    { t: "7. Root-cause findings", c: <ul className="space-y-2">{inv.findings.map((f) => <li key={f.id} className="flex justify-between gap-2"><span><b className="num text-xs">{f.id}</b> [{f.kind}] {f.claim}</span><EvidenceBadge state={f.state} /></li>)}</ul> },
    { t: "8. Evidence and source register", c: <ul className="list-disc pl-4">{[...new Set(inv.findings.map((f) => f.source))].map((s) => <li key={s}>{s}</li>)}</ul> },
    { t: "9. Reproducible calculations", c: <pre className="num overflow-x-auto rounded bg-muted p-2 text-xs">{`gap = actual − benchmark = ${bridge.actual} − ${bridge.base} = ${rec.gap}\nΣ steps = ${bridge.steps.map((s) => s.value).join(" + ")} = ${rec.explained}\nreconciles = ${rec.reconciles}`}</pre> },
    { t: "10. Data quality and verification results", c: <ul className="list-disc pl-4">{issues.filter((i) => ["DS-010", "DS-011", "DS-002"].includes(i.dataset)).map((i) => <li key={i.id}>{i.id} {i.title} — <StatusBadge value={i.status} /></li>)}</ul> },
    { t: "11. Limitations and unresolved questions", c: <ul className="list-disc pl-4">{[...inv.limitations, ...inv.contradictions].map((l) => <li key={l}>{l}</li>)}</ul> },
    { t: "12. Recommendations and impact assumptions", c: <ul className="list-disc pl-4">{inv.findings.map((f) => <li key={f.id}>{f.next}</li>)}</ul> },
    { t: "13. Action plan", c: <ul className="space-y-1">{acts.map((x) => <li key={x.id}>{x.id} {x.action} — {x.owner}, due {x.due} <StatusBadge value={x.status} /></li>)}</ul> },
    { t: "14. Reviewer sign-off and audit trail", c: <div className="space-y-2">{signoff ? <p>Signed off by {signoff.by} at {signoff.at}: {signoff.note}</p> : <p className="text-muted-foreground">Not signed off.</p>}<ul className="text-xs">{audit.map((e) => <li key={e.id}>{e.at} · {e.actor} · {e.action}</li>)}</ul></div> },
  ];

  const downloadHtml = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${r.title}</title><style>body{font-family:system-ui;max-width:900px;margin:2rem auto;color:#182230}h2{border-bottom:1px solid #ddd;padding-bottom:4px}</style></head><body><p><em>Synthetic demo data — fictional Northstar Bank</em></p>${ref.current?.innerHTML ?? ""}</body></html>`;
    downloadFile(`${r.id}.html`, html, "text/html");
    toast.success("HTML report downloaded");
  };
  const downloadMd = () => {
    const md = `# ${r.title}\n\n_Synthetic demo data. Verification: ${state}_\n\n` + inv.findings.map((f) => `- **${f.id}** [${f.kind}, ${f.state}] ${f.claim} (${f.source}, ${f.period})`).join("\n");
    downloadFile(`${r.id}.md`, md, "text/markdown");
  };

  return (
    <div className="space-y-5">
      <PageHeader crumbs={[{ label: "Reports", to: "/investigations" }, { label: r.id }]} title={r.title} description={`${r.owner} · ${r.period} · linked investigation ${inv.id}`}
        actions={<><EvidenceBadge state={state} /><Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</Button><Button size="sm" variant="outline" onClick={downloadHtml}><Download className="h-3.5 w-3.5" /> HTML</Button><Button size="sm" variant="outline" onClick={downloadMd}><Download className="h-3.5 w-3.5" /> Markdown</Button></>} />
      {!allVerified && <p className="no-print text-xs text-muted-foreground">This report cannot be labeled Verified: {inv.findings.filter((f) => f.state !== "VERIFIED").length} finding(s) are not fully verified. <Link to="/investigations/$id" params={{ id: inv.id }} className="text-primary">Open investigation</Link></p>}
      <div ref={ref} className="space-y-3">
        {sections.map((s) => <Panel key={s.t} title={s.t}><div className="text-sm">{s.c}</div></Panel>)}
      </div>
      {!signoff && (
        <Panel title="Reviewer sign-off" className="no-print">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reviewer comment (required)" />
          <Button size="sm" className="mt-2" disabled={!note.trim()} onClick={() => { const s = { by: "J. Avery", at: new Date().toISOString().slice(0, 16).replace("T", " "), note }; setSignoff(s); actions.log("Investigations", r.id, "Reviewer sign-off", note); toast.success("Sign-off recorded (demo)"); }}>Record sign-off</Button>
          <p className="mt-1 text-xs text-muted-foreground">Sign-off alone does not mark the report Verified while findings remain partially verified.</p>
        </Panel>
      )}
    </div>
  );
}
