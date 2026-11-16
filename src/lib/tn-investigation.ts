import type { Investigation, Report } from "@/data/investigations";
import { DEFINITIONS } from "@/lib/definitions";
import { reportState, withPolicyStates } from "@/lib/evidence-policy";
import type { readSector } from "@/lib/tn-connector.server";
import { filingAssessment, type Indicator } from "@/lib/tn-filings";
import type { Repository } from "@/repo/types";

export type SectorBank = Awaited<ReturnType<typeof readSector>>[number];

const ORDER: Indicator[] = ["net_banking_income", "net_loans", "customer_deposits", "bank_equity"];

/** The listed banks' latest quarter as an investigation and its report (L6 T4c). Each figure read is
 * a measured finding whose facts are its filing, so the evidence policy, not this code, sets its state. */
export function sectorInvestigation(
  banks: SectorBank[],
  ctx: { suffix: string; owner: string; today: string },
) {
  const id = `INV-TN-${ctx.suffix}`;
  const reportId = `RPT-TN-${ctx.suffix}`;
  const read = banks.flatMap((b) => (b.state === "ok" ? [b] : []));
  const last = read
    .map((b) => b.periodEnd)
    .sort()
    .at(-1);
  const period = last ? `Quarter to ${last}` : "No quarter read";
  const findings = read.flatMap((b) =>
    ORDER.map((ind) => {
      const f = b.figures[ind];
      const {
        claim,
        scope: _scope,
        today: _today,
        ...facts
      } = filingAssessment(b.company, ind, f, b.periodEnd, b.source, ctx.today);
      return {
        id: claim.id,
        claim: `${b.bank} ${DEFINITIONS[ind].label}: ${f.value.toFixed(1)} USD M`,
        evidence: `${b.bank}'s filing to ${b.periodEnd}, converted at ${f.fx.tndPerUsd} TND per USD (${f.fx.source}, ${f.fx.date}).`,
        source: b.source,
        period: f.period,
        method:
          "Read from the filing by column position in the statement's own unit, converted at the BCT's dollar rate for the period end.",
        kind: "Measured" as const,
        metricId: ind,
        entity: b.bank,
        facts,
        limitations: "A public filing used for testing and education (L6 T1).",
        next: "Compare with the bank's own figures for the same period.",
      };
    }),
  );
  const inv: Investigation = withPolicyStates(
    {
      id,
      title: "Tunisian listed banks: latest quarter",
      question: "How do the banks listed on the Bourse de Tunis compare on their latest quarter?",
      module: "Performance",
      department: "Sector",
      owner: ctx.owner,
      created: ctx.today,
      period,
      priority: "Medium",
      status: "Draft",
      report: reportId,
      outstanding: 0,
      findings,
      contradictions: [],
      limitations: banks.flatMap((b) =>
        b.state === "ok" ? [] : [`${b.bank} not read: ${b.detail}`],
      ),
    },
    ctx.today,
  );
  const report: Report = {
    id: reportId,
    title: inv.title,
    owner: ctx.owner,
    period,
    investigation: id,
    state: reportState(
      inv.findings.map((f) => f.state),
      0,
      false,
    ),
    status: "Draft",
    updated: ctx.today,
  };
  return { inv, report };
}

/** Stores the sector investigation and opens its report; returns the report's id (L6 T4c). */
export async function openSectorInvestigation(
  repo: Repository,
  banks: SectorBank[],
  owner: string,
  now = new Date(),
) {
  const { inv, report } = sectorInvestigation(banks, {
    suffix: now.getTime().toString(36).toUpperCase(),
    owner,
    today: now.toISOString().slice(0, 10),
  });
  await repo.investigations.create(inv);
  await repo.reports.create(report);
  return report.id;
}
