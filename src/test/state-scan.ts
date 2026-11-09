const STATES =
  "VERIFIED|PARTIALLY_VERIFIED|UNVERIFIED|CONFLICTING_EVIDENCE|NOT_AVAILABLE|DRAFT|HYPOTHESIS";
// Any quoted state, in any quotes, on any line: outside the schema and the policy none is needed.
const QUOTED = new RegExp(`(["'\`])(${STATES})\\1`, "g");
// Peer data's source type also has a NOT_AVAILABLE; that one is not an evidence state.
const SOURCE_TYPE = /\bsource\b|\bSourceType\b/;

/** Each `line: text` of `text` that writes an evidence state by hand. */
export const handWrittenStates = (text: string): string[] => {
  const lines = text.split("\n");
  return [...text.matchAll(QUOTED)].flatMap((m) => {
    const n = text.slice(0, m.index).split("\n").length;
    const line = lines[n - 1]!;
    return m[2] === "NOT_AVAILABLE" && SOURCE_TYPE.test(line) ? [] : [`${n}: ${line.trim()}`];
  });
};
