/** A deep copy no one can change: a saved version is never edited, only superseded. */
export function frozenCopy<T>(value: T): T {
  const freeze = (o: unknown) => {
    if (o && typeof o === "object" && !Object.isFrozen(o)) {
      Object.values(o).forEach(freeze);
      Object.freeze(o);
    }
  };
  const copy = structuredClone(value);
  freeze(copy);
  return copy;
}
