import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { ReactNode } from "react";
import { waterfallRows, type Bridge } from "@/lib/calc";
import { axisProps, CHART, tooltipStyle } from "@/components/kit";
import { StateBoundary, type DataState } from "@/components/states";
import { cn } from "@/lib/utils";

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
  children: ReactNode;
}) {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key, header: key }));
  return (
    <figure className={cn("m-0 min-w-0 rounded-md border bg-card", className)}>
      <figcaption className="flex items-start justify-between gap-3 border-b px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <p className="text-xs text-muted-foreground">
            {unit} · {period} · Source: {source}
          </p>
        </div>
        {actions}
      </figcaption>
      <div className="p-4">
        <StateBoundary state={state} label={title} note={stateNote}>
          {children}
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
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {cols.map((c) => (
                        <td key={c.key} className="num px-2 py-1">
                          {r[c.key] ?? "—"}
                        </td>
                      ))}
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

export function Waterfall({ bridge, height = 280 }: { bridge: Bridge; height?: number }) {
  const rows = waterfallRows(bridge);
  const color = (t: string) =>
    t === "total"
      ? CHART.c3
      : t === "up"
        ? CHART.success
        : t === "residual"
          ? CHART.c4
          : CHART.critical;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="name" {...axisProps} interval={0} />
        <YAxis {...axisProps} width={40} />
        <Tooltip
          {...tooltipStyle}
          formatter={(_v, _n, p) => [`$${(p.payload as { signed: number }).signed}M`, "Value"]}
        />
        <ReferenceLine y={0} stroke={CHART.grid} />
        <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar
          dataKey="value"
          stackId="a"
          isAnimationActive={false}
          label={{
            position: "top",
            fontSize: 11,
            fill: CHART.text,
            formatter: (v: number) => v.toFixed(1),
          }}
        >
          {rows.map((r, i) => (
            <Cell key={i} fill={color(r.type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
