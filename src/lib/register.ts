// One look for every register table. The header's rule is an inset shadow: under
// border-collapse a row border stays behind when its sticky cells move.
export const REGISTER_BOX = "max-h-[70vh] overflow-auto";
export const REGISTER_HEAD =
  "sticky top-0 z-10 whitespace-nowrap bg-muted text-left text-caption font-semibold uppercase tracking-wider text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]";
export const REGISTER_TH = `${REGISTER_HEAD} px-cell-x py-cell-y`;

// Read as one token, so never wrapped: identifiers (prefix-number, e.g. ABC-123), dates,
// and an amount with its currency. The browser check imports these same patterns.
export const ID = /^[A-Z][A-Z0-9]{0,6}(?:-[A-Z0-9]+)+$/;
export const DATE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/;
export const MONEY = /^-?[\d,.]+ [A-Z]{3}$/;
export const isWhole = (s: string) => ID.test(s) || DATE.test(s) || MONEY.test(s);
