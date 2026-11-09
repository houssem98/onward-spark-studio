import { useRef, useState } from "react";

// A step that takes a while: it shows that it is running, can be cancelled (its late result is then
// ignored, never applied), and on failure keeps its input and error so it can be retried as it was.
// Cancelling stops waiting; it cannot recall a write the server has already received.
export function useStep<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  onDone: (result: R) => void,
) {
  const [state, setState] = useState<{
    status: "idle" | "running" | "error";
    error?: string;
    args?: A;
  }>({ status: "idle" });
  const current = useRef(0);

  const run = async (...args: A) => {
    const mine = ++current.current;
    setState({ status: "running", args });
    try {
      const result = await fn(...args);
      if (mine !== current.current) return;
      setState({ status: "idle" });
      onDone(result);
    } catch (e) {
      if (mine !== current.current) return;
      setState({ status: "error", error: (e as Error).message, args });
    }
  };
  const cancel = () => {
    current.current++;
    setState({ status: "idle" });
  };
  const retry = () => (state.args ? run(...state.args) : Promise.resolve());

  return { ...state, run, cancel, retry };
}
