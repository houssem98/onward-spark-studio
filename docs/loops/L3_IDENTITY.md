# L3 Identity

Phase 3 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Identity, authorization and persistence". Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#no production data is accessible through client-side`

Deciding rule, fixed before T2 starts: T0 to T8 are ticked, `npm run gate` exits 0, and the human's signoff line (T9) is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- There is no backend: `src/server.ts` only wraps the TanStack Start SSR entry and its error page. Every decision lives in browser memory (`src/store/app-store.ts#let state: State = {`) and is lost on reload.
- Identity is a constant (`src/store/app-store.ts#user: { name: "J. Avery", role: "Chief Risk Officer" },`), so audit events name whoever that constant says (`src/store/app-store.ts#actor: state.user.name`).
- The maker can approve its own work: `src/store/app-store.ts#decideModel(model: string, decision: "Approved" | "Rejected", comment: string) {`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L2 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) Backend. needs: T0. New infrastructure, so the human decides. Recommended: Lovable Cloud (Supabase: auth, Postgres, row-level security), because the project is Lovable-connected and RLS puts tenant checks in the database; alternative: TanStack Start server functions over `node:sqlite`. Also decide the role list (recommended: executive, credit analyst, investigator, reviewer, model validator, admin) and where secrets live. Evidence: the decision lines in the Journal.
- [ ] T2 Identity. needs: T1. A production repository adapter (L2 T5) backed by the chosen store; sign-in and sign-out; the role comes from the server, never the client; the constant user remains only in the demo adapter. Evidence: tests: an unauthenticated read is refused; a client-sent role is ignored; a signed-out session is refused.
- [ ] T3 Tenancy and permissions. needs: T2. Every read, update, search and export checks tenant and role on the server (RLS policies or one guard module that every server function calls). Evidence: tests: org B reads, updates, searches and exports org A's investigation, report, action and audit event by id and is refused each time.
- [ ] T4 Persistence. needs: T3. Investigations, actions, approvals, report drafts and audit events are durable; schema migrations are committed. Evidence: tests: create, then a fresh client reads it back; a migration from empty applies cleanly.
- [ ] T5 Audit integrity. needs: T4. Audit events are append-only and carry actor, authority, action, target, timestamp, outcome and correlation id; clients cannot update or delete them; exports write an audit event and check permission. Evidence: tests: update and delete of an audit row are refused; each export writes one event; an export without permission is refused and audited.
- [ ] T6 Separation of duties. needs: T3. The submitter of a model, report or action cannot approve it, admins included; approving twice or after rejection is refused. Evidence: tests for each.
- [ ] T7 Backup and restore. needs: T4. A documented backup and restore procedure and retention policy in `docs/ops/BACKUP_RESTORE.md` (new); where the platform manages backups, the human runs one restore drill. Evidence: a restore test into an empty database, or the human's drill line.
- [ ] T8 Independent check. needs: T5, T6, T7. A different model, in at least 3 independent runs, applies the identity, tenancy, separation-of-duties, audit and persistence attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T9 (human) Signoff. needs: T8. Includes signing in as two users of two orgs. Evidence: the signoff line in the Journal.

## Journal
