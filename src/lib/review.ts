// Review of a saved report version, with L3 T6's separation of duties: the submitter never decides,
// whatever their role; only the assigned reviewer decides, once; a rejection is reworked as a new
// version. Pure: each step returns the next review, or the reason it is refused.
export interface Review {
  report: string;
  version: number;
  submittedBy: string;
  reviewer: string;
  at: string;
  comments: { by: string; at: string; text: string }[];
  decision?: { decision: "Approved" | "Rejected"; by: string; at: string; comment: string };
  synthetic?: true;
}

const closed = (r: Review) =>
  r.decision && `Version ${r.version} is already ${r.decision.decision.toLowerCase()}.`;

export function submit(
  reviews: Review[],
  saved: number[],
  s: { report: string; version: number; reviewer: string },
  actor: string,
  at: string,
): Review | string {
  if (!saved.includes(s.version)) return `Version ${s.version} of ${s.report} is not saved.`;
  if (!s.reviewer.trim()) return "Name a reviewer.";
  if (s.reviewer === actor) return "The submitter cannot review their own report.";
  const mine = reviews.filter((r) => r.report === s.report);
  if (mine.some((r) => r.version === s.version))
    return `Version ${s.version} is already submitted.`;
  const pending = mine.find((r) => !r.decision);
  if (pending) return `Version ${pending.version} is still under review.`;
  return { ...s, submittedBy: actor, at, comments: [] };
}

export function comment(r: Review, actor: string, text: string, at: string): Review | string {
  if (r.decision) return closed(r)!;
  if (actor !== r.submittedBy && actor !== r.reviewer)
    return "Only the submitter and the reviewer may comment.";
  if (!text.trim()) return "A comment needs text.";
  return { ...r, comments: [...r.comments, { by: actor, at, text }] };
}

export function decide(
  r: Review,
  actor: string,
  decision: "Approved" | "Rejected",
  note: string,
  at: string,
): Review | string {
  if (actor === r.submittedBy)
    return "The submitter cannot approve or reject their own report, whatever their role.";
  if (actor !== r.reviewer) return `Only the assigned reviewer, ${r.reviewer}, may decide.`;
  if (r.decision) return closed(r)!;
  if (decision === "Rejected" && !note.trim()) return "A rejection needs a comment.";
  return { ...r, decision: { decision, by: actor, at, comment: note } };
}

const STATUSES = ["Open", "In Progress", "Done"];

/** Why an action, or a change to one, is refused; null when it stands. */
export function actionProblem(a: { owner?: string; due?: string; status?: string }) {
  if (a.owner !== undefined && !a.owner.trim()) return "An action needs an owner.";
  if (a.due !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(a.due))
    return "An action needs a due date.";
  if (a.status !== undefined && !STATUSES.includes(a.status))
    return "An action's status is Open, In Progress or Done.";
  return null;
}
