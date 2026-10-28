# BankIntelli Elite Roadmap

The input is `BankIntelli_Elite_Premium_Design_Roadmap.md` (product, design and phases). This document turns it into an executable program: nine loops, each with a ledger of tasks whose evidence is a command with an exit code. The driver is `BANKINTELLI_LOOP.md`; the graph is `docs/LOOP_GRAPH.md`; the rules are `docs/LOOP_CONVENTIONS.md`.

## 1. North star

`BankIntelli_Elite_Premium_Design_Roadmap.md#BankIntelli is world-class when a banking professional can trust its`

Elite here means four properties, each enforced by a check rather than a promise:

| Property | Enforced by |
|---|---|
| Every number is reproducible | L2 calc tests, L5 report versions that re-render identically |
| Every claim carries its evidence or its limits | L4 policy is the only code that can produce VERIFIED |
| Every decision is attributable | L3 server identity, append-only audit, separation of duties |
| Synthetic never passes as real | L2 `synthetic: true` on every demo record, labeled exports |

Premium design follows from that: one token system, grouped navigation with no dead destinations, eight required component states, keyboard-first, charts that always state unit, period and source (L1).

## 2. Truth today (read 2026-10-28)

A front-end proof of concept for the fictional Northstar Bank, built in Lovable. Nothing below is a test result; L0 T0 produces the first.

| Area | State | Evidence |
|---|---|---|
| Build, typecheck, lint, tests | not verified: never run here, no `node_modules` | `src/test/app-routing.test.tsx` is the only test |
| Routes | 11 route files; `/reports/$id` linked 5 times and absent | `src/lib/copilot.ts#to: "/reports/RPT-FY25-PERF"` |
| Data | fixtures imported straight into pages | `src/routes/index.tsx#import { DEPARTMENTS, quarterlyRevenue } from "@/data/finance";` |
| Persistence | browser memory, lost on reload | `src/store/app-store.ts#let state: State = {` |
| Identity | one hard-coded Chief Risk Officer | `src/store/app-store.ts#user: { name: "J. Avery", role: "Chief Risk Officer" },` |
| Evidence states | typed, hand-assigned, VERIFIED included | `src/lib/copilot.ts#state: "VERIFIED", missing: ["Targets are synthetic budget figures"]` |
| AI | canned regex routing, labeled in code only | `src/lib/copilot.ts#no live LLM is connected` |
| Approvals | the maker approves its own model to Production | `src/store/app-store.ts#decideModel(model: string,` |
| Reconciliation | exact, untested | `src/lib/calc.ts#export function reconcileBridge(b: Bridge) {` |
| Exports | unlabeled CSV, no formula neutralization | `src/lib/calc.ts#export function toCSV(` |
| Synthetic notice | sidebar footer only, hidden when collapsed | `src/components/AppShell.tsx#{!collapsed && <p className="mb-2 px-1 text-[10px] leading-snug text-ink-muted">Proof of concept.` |

## 3. Phases to loops

| Roadmap phase | Loop | Exit gate (cited from the input) | First human decision |
|---|---|---|---|
| 0 Baseline and design audit | L0 Truth | `BankIntelli_Elite_Premium_Design_Roadmap.md#reproducible build; baseline test report; no unknown` | L0 T2 reports route |
| 1 Design system and shell | L1 Design | `BankIntelli_Elite_Premium_Design_Roadmap.md#all main routes share one coherent design language;` | L1 T8 visual signoff |
| 2 Data boundaries and demo mode | L2 Data | `BankIntelli_Elite_Premium_Design_Roadmap.md#demo data is isolated; the UI can switch to an` | L2 T9 signoff |
| 3 Identity, authorization, persistence | L3 Identity | `BankIntelli_Elite_Premium_Design_Roadmap.md#no production data is accessible through client-side` | L3 T1 backend and roles |
| 4 Evidence and source registry | L4 Evidence | `BankIntelli_Elite_Premium_Design_Roadmap.md#every material report claim is linked to evidence or` | L4 T7 signoff |
| 5 Flagship investigation | L5 Flagship | `BankIntelli_Elite_Premium_Design_Roadmap.md#an executive can ask a question and reach a reviewed,` | L5 T8 question in the UI |
| 6 Domain integrations | L6 Integrations | `BankIntelli_Elite_Premium_Design_Roadmap.md#each integration has contract tests, freshness` | L6 T1 first source and licence |
| 7 Controlled AI | L7 AI | `BankIntelli_Elite_Premium_Design_Roadmap.md#no unsupported verified claims in the golden` | L7 T1 provider and data residency |
| 8 Enterprise readiness | L8 Enterprise | `BankIntelli_Elite_Premium_Design_Roadmap.md#the pilot is safe, supportable and auditable` | L8 T1 CI, L8 T2 E2E runner |

## 4. The input's 15 tickets

| # | Ticket | Task |
|---|---|---|
| 1 | typecheck, lint, test, build CI | L0 T0–T1 locally, L8 T1 in CI |
| 2 | route-by-route baseline | L0 T4, L0 T6 |
| 3 | design tokens and usage rules | L1 T1 |
| 4 | shell and navigation | L1 T2, L1 T3 |
| 5 | KPI, table, chart, evidence components | L1 T4 |
| 6 | Demo/Production and freshness indicators | L1 T2, L2 T5, L6 T3 |
| 7 | calculation edge-case tests | L2 T1 |
| 8 | typed API contracts and repository | L2 T2 |
| 9 | demo adapter | L2 T2–T4 |
| 10 | tenant, identity, role, policy | L3 T1–T3, L3 T6 |
| 11 | durable investigations and reports | L3 T4, L5 T4 |
| 12 | source, claim, evidence schemas | L4 T1 |
| 13 | deterministic evidence policy | L4 T2–T4 |
| 14 | credit-vs-peer report lifecycle | L5 T2–T5 |
| 15 | security, accessibility, E2E gates | L1 T5, L8 T3, L8 T5, L8 T6 |

## 5. Human decision queue

The loop halts at each of these; answering them early keeps it moving.

1. L0 T2: build an honest `/reports/$id` placeholder now (recommended) or remove the five links.
2. L3 T1: backend (recommended: Lovable Cloud with row-level security) and the role list.
3. L6 T1: the first real source, its licence and where its credentials live.
4. L7 T1: model provider, data residency, spend cap.
5. L8 T1, T2: CI workflow and an E2E runner.
6. Every loop's signoff, and every loop line tick.

## 6. Out of scope until a ledger names it

Financial-crime integrations before the L8 security review; real customer data anywhere; compliance claims; decorative visuals with no decision purpose (`BankIntelli_Elite_Premium_Design_Roadmap.md#Avoid decorative`).
