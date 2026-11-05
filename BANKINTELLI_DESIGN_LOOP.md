Goal: BankIntelli looks and moves like a world-class institutional product without giving up a single trust property: one art direction, motion that explains and never misstates a number, explanations that reconcile, every claim proven in a real browser. No test, no claim. Synthetic data is always labeled. Premium means clear, fast and reliable, not decorated.

One iteration of the design track. Read docs/LOOP_GRAPH.md (driver rules, rule 6), then docs/LOOP_CONVENTIONS.md, then the active loop's ledger.

1. Health: `git status`, the `npm run gate` verdict, and the active loop's ticks and spend against its budget.
2. Pick the active loop among L9, L10, L11 and L12 and its task by the graph's driver rules. Stop check per Conventions: Target, Budget, Stall. If one holds, or only (human) tasks remain in the track, write the Journal entry, say which, and do not schedule another tick.
3. Write `started T<n>` in the Journal. Write the task's failing check first, then the smallest change that passes it. One task per tick.
4. Run the task's Evidence command, then `npm run gate`. Tick the task only on exit 0, with the output quoted in the Journal. Commit locally per Conventions; never push.
5. Finish the Journal entry: status, gate, commit, what happened, a Direction line, the next task.
6. Escalate per Conventions instead of deciding anything on that list. Next tick in 120 seconds.
