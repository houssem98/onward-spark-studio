import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { waterfallRows, type Bridge } from "@/lib/calc";
import { axisProps, CHART, tooltipStyle } from "@/components/kit";

export function Waterfall({ bridge, height = 280 }: { bridge: Bridge; height?: number }) {
  const rows = waterfallRows(bridge);
  const color = (t: string) => (t === "total" ? CHART.c3 : t === "up" ? CHART.success : t === "residual" ? CHART.c4 : CHART.critical);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="name" {...axisProps} interval={0} />
        <YAxis {...axisProps} width={40} />
        <Tooltip {...tooltipStyle} formatter={(_v, _n, p) => [`$${(p.payload as { signed: number }).signed}M`, "Value"]} />
        <ReferenceLine y={0} stroke={CHART.grid} />
        <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="a" isAnimationActive={false} label={{ position: "top", fontSize: 11, fill: CHART.text, formatter: (v: number) => v.toFixed(1) }}>
          {rows.map((r, i) => <Cell key={i} fill={color(r.type)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
