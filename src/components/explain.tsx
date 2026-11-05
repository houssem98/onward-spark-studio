import { useEffect, useState, type CSSProperties } from "react";
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
import { CHART, TYPE } from "@/components/kit";
import { useMotionMs, useReducedMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { fmtSigned } from "@/lib/calc";
import { CASE_CAVEAT, caseBridge, cumulativeAt, globalImportance, stepLine } from "@/lib/explain";
import type { ModelExplanation } from "@/repo/types";

const f4 = (v: number) => fmtSigned(v, 4);

const W = 960;
const LEFT = 168;
const RIGHT = 24;
const ROW = 32;
const AXIS = 24;
/** Low to high feature value, from teal into amber, clear of the red and green that mark direction. */
const SWATCHES = [0, 25, 50, 75, 100].map(
  (p) => `color-mix(in oklch, var(--chart-4) ${p}%, var(--chart-2))`,
);

/** A value's mid-rank quantile among the feature's values, in five colour bins. */
function bin(values: number[], v: number) {
  const below = values.filter((w) => w < v).length;
  const same = values.filter((w) => w === v).length;
  return Math.min(4, Math.floor(((below + (same - 1) / 2) / Math.max(1, values.length - 1)) * 5));
}

/**
 * Every case's contribution for every feature on one zero-centred scale, one row per feature in
 * importance order, with a fixed jitter inside the row. Points travel once from zero to their
 * place, and are placed at once under reduced motion; the table lists every point.
 */
export function Beeswarm({ explanation: e }: { explanation: ModelExplanation }) {
  const [only, setOnly] = useState("all");
  const features = globalImportance(e).map((r) => r.feature);
  const m = Math.max(
    ...e.observations.flatMap((o) => e.features.map((f) => Math.abs(o.contributions[f]!))),
  );
  const x1 = W - RIGHT;
  const x = (c: number) => Math.round((LEFT + ((c + m) / (2 * m)) * (x1 - LEFT)) * 100) / 100;
  const zero = x(0);
  const h = features.length * ROW + AXIS;

  return (
    <ChartFrame
      title="Contributions by case"
      unit="SHAP contribution, log-odds"
      period={`${e.model} ${e.version}`}
      source={e.source}
      description="One point per case and feature; right of zero raised the log-odds, left lowered them."
      rows={e.observations.map((o) => ({
        case: o.id,
        ...Object.fromEntries(features.map((f) => [f, f4(o.contributions[f]!)])),
      }))}
      columns={[{ key: "case", header: "Case" }, ...features.map((f) => ({ key: f, header: f }))]}
      actions={
        <div className="flex items-center gap-2">
          <select
            aria-label="Feature"
            className="h-8 rounded-md border bg-card px-2 text-xs"
            value={only}
            onChange={(ev) => setOnly(ev.target.value)}
          >
            <option value="all">All features</option>
            {features.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            aria-label="Reset features"
            onClick={() => setOnly("all")}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <svg
          data-beeswarm
          data-x0={LEFT}
          data-x1={x1}
          width={W}
          height={h}
          viewBox={`0 0 ${W} ${h}`}
          role="img"
          aria-label={`Contributions of ${e.observations.length} cases for ${features.length} features; the table lists every point.`}
        >
          <line x1={zero} x2={zero} y1={0} y2={h - AXIS} stroke={CHART.grid} />
          {[-m, 0, m].map((t) => (
            <text
              key={t}
              x={x(t)}
              y={h - 6}
              textAnchor="middle"
              fontSize={TYPE.caption}
              fill={CHART.text}
            >
              {t === 0 ? "0" : fmtSigned(t, 2)}
            </text>
          ))}
          {features.map((f, r) => {
            const top = r * ROW;
            const values = e.observations.map((o) => o.values[f]!);
            return (
              <g
                key={f}
                data-row={f}
                visibility={only === "all" || only === f ? undefined : "hidden"}
              >
                <text
                  x={4}
                  y={top + ROW / 2}
                  dominantBaseline="middle"
                  fontSize={TYPE.caption}
                  fill={CHART.text}
                >
                  {f}
                </text>
                {e.observations.map((o, i) => {
                  const c = o.contributions[f]!;
                  const cx = x(c);
                  return (
                    <circle
                      key={o.id}
                      data-case={o.id}
                      data-feature={f}
                      className="point-travel"
                      cx={cx}
                      cy={top + ROW / 2 + (((i * 0.618034) % 1) - 0.5) * (ROW - 12)}
                      r={3.5}
                      fill={SWATCHES[bin(values, o.values[f]!)]}
                      style={{ "--from": `${(zero - cx).toFixed(2)}px` } as CSSProperties}
                    >
                      <title>{`${o.id} · ${f} ${o.values[f]} · ${f4(c)}`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div data-legend className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Feature value: low</span>
        {SWATCHES.map((s) => (
          <span key={s} data-swatch className="size-2.5 rounded-full" style={{ background: s }} />
        ))}
        <span>high</span>
      </div>
    </ChartFrame>
  );
}

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
