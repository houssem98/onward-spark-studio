import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { ChartFrame, Waterfall } from "@/components/charts";
import { useMotionMs, useReducedMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { fmtSigned } from "@/lib/calc";
import { CASE_CAVEAT, caseBridge, cumulativeAt, stepLine } from "@/lib/explain";
import type { ModelExplanation } from "@/repo/types";

const f4 = (v: number) => fmtSigned(v, 4);

/**
 * One case's explanation as a waterfall from the baseline to the output, revealed a whole step at
 * a time. Play holds each step for two data durations; under reduced motion the final state shows
 * at once and play goes straight to it, while the step controls keep working.
 */
export function CaseWaterfall({ explanation: e }: { explanation: ModelExplanation }) {
  const reduced = useReducedMotion();
  const ms = useMotionMs("--duration-data");
  const [caseId, setCaseId] = useState(e.observations[0]!.id);
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const o = e.observations.find((x) => x.id === caseId)!;
  const b = caseBridge(e, o);
  const last = b.steps.length;
  const at = step ?? (reduced ? last : 0);

  useEffect(() => {
    if (!playing) return;
    if (at >= last) return setPlaying(false);
    const t = setTimeout(() => setStep(at + 1), ms * 2);
    return () => clearTimeout(t);
  }, [playing, at, last, ms]);

  const go = (n: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(last, n)));
  };
  const play = () => {
    if (reduced) return go(last);
    if (at >= last) setStep(0);
    setPlaying(true);
  };
  const s = at > 0 ? b.steps[at - 1]! : null;
  const direction = s ? (s.value > 0 ? "up" : "down") : undefined;

  const rows = [
    { step: b.baseLabel, value: "—", contribution: "—", after: f4(b.base) },
    ...b.steps.map((x, i) => ({
      step: x.label,
      value: o.values[x.label] ?? "—",
      contribution: f4(x.value),
      after: f4(cumulativeAt(b, i + 1)),
    })),
    { step: b.actualLabel, value: "—", contribution: "—", after: f4(b.actual) },
  ];

  return (
    <div data-case-waterfall data-step={at} data-cumulative={cumulativeAt(b, at)}>
      <ChartFrame
        title="Case explanation"
        unit="Log-odds of default"
        period={`${e.model} ${e.version}`}
        source={e.source}
        description={CASE_CAVEAT}
        rows={rows}
        columns={[
          { key: "step", header: "Step" },
          { key: "value", header: "Feature value" },
          { key: "contribution", header: "Contribution" },
          { key: "after", header: "Log-odds after" },
        ]}
        actions={
          <select
            aria-label="Case"
            className="h-8 rounded-md border bg-card px-2 text-xs"
            value={caseId}
            onChange={(ev) => {
              setCaseId(ev.target.value);
              setStep(null);
              setPlaying(false);
            }}
          >
            {e.observations.map((x) => (
              <option key={x.id} value={x.id}>
                {x.id}
              </option>
            ))}
          </select>
        }
      >
        <Waterfall bridge={b} shown={at === last ? last + 1 : at} tone="risk" format={f4} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label={playing ? "Pause" : "Play"}
            onClick={playing ? () => setPlaying(false) : play}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Step back"
            disabled={at === 0}
            onClick={() => go(at - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Step forward"
            disabled={at === last}
            onClick={() => go(at + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" variant="outline" aria-label="Reset" onClick={() => go(0)}>
            <RotateCcw className="size-4" />
          </Button>
          <span className="num text-xs text-muted-foreground">
            Step {at} of {last}
          </span>
        </div>
        <p
          data-step-line
          data-direction={direction}
          aria-live="polite"
          className="mt-2 flex items-center gap-1.5 text-xs"
        >
          {direction === "up" && (
            <ArrowUpRight data-icon="up" aria-hidden className="size-4 shrink-0 text-critical" />
          )}
          {direction === "down" && (
            <ArrowDownRight data-icon="down" aria-hidden className="size-4 shrink-0 text-success" />
          )}
          <span>{stepLine(b, o, at)}</span>
        </p>
      </ChartFrame>
    </div>
  );
}
