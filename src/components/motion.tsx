import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

/** False on the server and during hydration, so both render the same markup. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const q = matchMedia(REDUCE);
      q.addEventListener("change", onChange);
      return () => q.removeEventListener("change", onChange);
    },
    () => matchMedia(REDUCE).matches,
    () => false,
  );
}

/** A motion token in milliseconds; the CSS minifier may write it in seconds. */
function tokenMs(name: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000 || 0;
}

const constant = () => () => {};

/** A motion token in milliseconds on the client; 0 on the server, where nothing animates. */
export function useMotionMs(name: string) {
  return useSyncExternalStore(
    constant,
    () => tokenMs(name),
    () => 0,
  );
}

/**
 * Fades its content up once it scrolls into view. Content already on screen at mount, under
 * reduced motion or without IntersectionObserver is never hidden.
 */
export function Reveal({
  children,
  className,
  stagger,
}: {
  children: ReactNode;
  className?: string | undefined;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");
  useLayoutEffect(() => {
    const el = ref.current!;
    if (
      reduced ||
      typeof IntersectionObserver === "undefined" ||
      el.getBoundingClientRect().top < innerHeight
    )
      return;
    setState("hidden");
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      setState("shown");
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);
  return (
    <div
      ref={ref}
      data-reveal={reduced ? "idle" : state}
      data-stagger={stagger || undefined}
      className={className}
    >
      {children}
    </div>
  );
}

/** A Reveal whose direct children arrive one --stagger apart; the sixth and later arrive together. */
export function Stagger(props: { children: ReactNode; className?: string | undefined }) {
  return <Reveal {...props} stagger />;
}

/**
 * Shows a figure that eases from its old value to a new one within --duration-base, never past
 * it. Screen readers get the final value from the first frame; the first render never tweens.
 */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    const ms = reduced ? 0 : tokenMs("--duration-base");
    if (from === value || ms === 0) {
      current.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    let start: number | undefined;
    const frame = (ts: number) => {
      start ??= ts;
      const t = Math.min(1, (ts - start) / ms);
      current.current = t < 1 ? from + (value - from) * (1 - (1 - t) ** 3) : value;
      setShown(current.current);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  // At rest the figure is one text; only a tween splits it into a visible and a spoken copy.
  if (shown === value) return <span>{format(value)}</span>;
  return (
    <span>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
