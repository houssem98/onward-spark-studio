import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  DefaultTooltipContent,
  LabelList,
  type TooltipProps,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Children, cloneElement, isValidElement, useId, useState, type ReactNode } from "react";
import { stepTooltip, UNAVAILABLE, waterfallRows, type Bridge } from "@/lib/calc";
import { axisProps, CHART, SyntheticTag, tooltipStyle, TYPE } from "@/components/kit";
import { RELIABILITY, reliabilityOf } from "@/lib/reliability";
import { describeFigure } from "@/lib/evidence";
import { repo } from "@/repo/queries";
import { useMotionMs, useReducedMotion } from "@/components/motion";
import { StateBoundary, type DataState } from "@/components/states";
import { cn } from "@/lib/utils";

const SERIES: unknown[] = [Area, Bar, Line, Scatter];

/**
 * Hands every series in a chart tree the same motion settings. Recharts finds series by type,
 * so the elements are cloned rather than wrapped; axes, grids and tooltips are left as they are.
 */
function withMotion(node: ReactNode, motion: Record<string, unknown>): ReactNode {
  if (Array.isArray(node)) return Children.map(node, (n) => withMotion(n, motion));
  if (!isValidElement<{ children?: ReactNode; [prop: string]: unknown }>(node)) return node;
  const series = SERIES.includes(node.type);
  const kids = node.props.children;
  if (!series && kids === undefined) return node;
  // A series that opts out of animation stays out.
  const still = node.props["isAnimationActive"] === false;
  return cloneElement(
    node,
    series && !still ? motion : {},
    ...(Array.isArray(kids) ? kids.map((k) => withMotion(k, motion)) : [withMotion(kids, motion)]),
  );
}

/** A chart always states its unit, period and source, and offers its data as a table. */
export function ChartFrame({
  title,
  unit,
  period,
  source,
  rows,
  columns,
  state,
  stateNote,
  description,
  actions,
  className,
  activeRow,
  headingLevel = 2,
  children,
}: {
  title: string;
  unit: string;
  period: string;
  source: string;
  rows: Record<string, string | number | null | undefined>[];
  columns?: { key: string; header: string }[];
  state?: DataState;
  stateNote?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** The table row the chart points at, by index: the one hovered or focused in the chart. */
  activeRow?: number | undefined;
  /** 3 when the chart sits inside a section that has its own heading. */
  headingLevel?: 2 | 3;
  children: ReactNode;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  // A row may say how reliable its figure is; otherwise the frame's source does.
  const cols = (columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key, header: key }))).filter(
    (c) => c.key !== "reliability",
  );
  const demo = repo.environment === "demo";
  // A row whose figure is unavailable has no reliable figure, whatever the frame's source.
  const reliable = (r: (typeof rows)[number]) =>
    r["reliability"] ||
    (cols.some((c) => r[c.key] === null)
      ? describeFigure({ reliability: "unavailable", reason: `${source} gives no value for it` })
      : reliabilityOf(source));
  const reduced = useReducedMotion();
  const ms = useMotionMs("--duration-data");
  const motion =
    reduced || !ms
      ? { isAnimationActive: false }
      : { isAnimationActive: true, animationDuration: ms };
  return (
    <figure className={cn("m-0 min-w-0 rounded-md border bg-card", className)}>
      <figcaption className="flex items-start justify-between gap-3 border-b px-4 py-2.5">
        <div>
          <Heading className="text-sm font-semibold">{title}</Heading>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <p className="text-xs text-muted-foreground">
            {unit} · {period} · Source: {source}
            {demo && (
              <>
                {" "}
                <SyntheticTag label="Synthetic" />
              </>
            )}
          </p>
        </div>
        {actions}
      </figcaption>
      <div className="p-4">
        <StateBoundary state={state} label={title} note={stateNote}>
          {withMotion(children, motion)}
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">Show data as a table</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {cols.map((c) => (
                      <th key={c.key} className="px-2 py-1 text-left font-semibold">
                        {c.header}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-left font-semibold">{RELIABILITY}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      data-active={i === activeRow || undefined}
                      className={cn("border-b last:border-0", i === activeRow && "bg-accent")}
                    >
                      {cols.map((c) => (
                        <td key={c.key} className="num whitespace-nowrap px-2 py-1">
                          {r[c.key] === null ? UNAVAILABLE : (r[c.key] ?? "—")}
                        </td>
                      ))}
                      <td data-reliability className="px-2 py-1">
                        {reliable(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </StateBoundary>
      </div>
    </figure>
  );
}

/**
 * Features ranked by importance as bars that grow from zero to their value. Each bar is a button:
 * hovering or focusing it points at its table row through `onActive`, activating it opens the
 * feature's definition below the bars.
 */
export function ImportanceBars({
  rows,
  definitions,
  active,
  onActive,
}: {
  rows: { feature: string; value: number }[];
  definitions: Record<string, string>;
  active: string | null;
  onActive: (feature: string | null) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const id = useId();
  const max = Math.max(0, ...rows.map((r) => r.value)) || 1;
  return (
    <div>
      <ul className="space-y-1" aria-label="Features ranked by importance">
        {rows.map((r) => (
          <li key={r.feature}>
            <button
              type="button"
              data-importance-bar
              data-feature={r.feature}
              data-value={r.value}
              aria-expanded={open === r.feature}
              aria-controls={id}
              onMouseEnter={() => onActive(r.feature)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(r.feature)}
              onBlur={() => onActive(null)}
              onClick={() => setOpen(open === r.feature ? null : r.feature)}
              className={cn(
                "grid w-full grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 rounded-md px-2 py-1 text-left text-xs hover:bg-accent/50",
                active === r.feature && "bg-accent",
              )}
            >
              <span className="truncate font-mono">{r.feature}</span>
              <span className="h-3 rounded-sm bg-muted">
                <span
                  data-bar-fill
                  className="bar-grow block h-full rounded-sm"
                  style={{ width: `${(r.value / max) * 100}%`, background: CHART.c1 }}
                />
              </span>
              <span className="num text-right">{r.value.toFixed(4)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div id={id} aria-live="polite" className="mt-3 border-t pt-2 text-xs">
        {open ? (
          <p>
            <span className="font-mono font-medium">{open}</span>: {definitions[open]}
          </p>
        ) : (
          <p className="text-muted-foreground">Select a feature to read its definition.</p>
        )}
      </div>
    </div>
  );
}

/**
 * A bridge as a standing waterfall. `shown` reveals rows up to that index whole, each where it
 * ends, and keeps the rest's geometry so the axis never rescales; `tone="risk"` colours an
 * increase as the critical direction, as for a probability of default.
 */
export function Waterfall({
  bridge,
  height = 280,
  shown,
  tone = "gain",
  format,
}: {
  bridge: Bridge;
  height?: number;
  shown?: number;
  tone?: "gain" | "risk";
  format?: (v: number) => string;
}) {
  const rows = waterfallRows(bridge).map((r, i) => {
    const hidden = shown !== undefined && i > shown;
    return { ...r, hidden, label: hidden ? undefined : format ? format(r.signed) : r.signed };
  });
  const [up, down] =
    tone === "risk" ? [CHART.critical, CHART.success] : [CHART.success, CHART.critical];
  const color = (t: string) =>
    t === "total" ? CHART.c3 : t === "up" ? up : t === "residual" ? CHART.c4 : down;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="name" {...axisProps} interval={0} />
        <YAxis {...axisProps} width={40} />
        <Tooltip
          {...tooltipStyle}
          formatter={
            format
              ? (_v: unknown, _n: unknown, p: { payload?: { signed: number } }) => [
                  format(p.payload!.signed),
                  "Value",
                ]
              : stepTooltip
          }
          // A step not revealed yet keeps its place on the axis but tells nothing on hover.
          {...(shown !== undefined && {
            content: (p: TooltipProps<number, string>) =>
              (p.payload?.[0]?.payload as { hidden?: boolean } | undefined)?.hidden ? null : (
                <DefaultTooltipContent {...p} />
              ),
          })}
        />
        <ReferenceLine y={0} stroke={CHART.grid} />
        <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="a" isAnimationActive={false}>
          {/* Label the signed step; the stacked bar's own value is the stack top. */}
          <LabelList dataKey="label" position="top" fontSize={TYPE.caption} fill={CHART.text} />
          {rows.map((r, i) => (
            <Cell key={i} fill={r.hidden ? "transparent" : color(r.type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
