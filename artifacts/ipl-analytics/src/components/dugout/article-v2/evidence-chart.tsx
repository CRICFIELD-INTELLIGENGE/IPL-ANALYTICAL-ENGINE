// Evidence chart for v2 Dugout articles. Every chart draws from an evidence table, so its title,
// unit, filters, sample size and source come from the same record that produced the numbers.
// Palette: series 1 = franchise accent, series 2 = #3189CF (validated together on #101726).
import type React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ArticleChart, EvidenceFile } from "@/data/editorial/schema";
import { TokenText } from "./token-text";

const SECOND = "#3189CF";
const INK = { primary: "#e2e8f0", muted: "#94a3b8", grid: "rgba(148,163,184,0.12)", ref: "#64748b" };
const tick = { fill: INK.muted, fontSize: 11 };

function fmt(v: unknown) {
  return typeof v === "number" ? (Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toFixed(Math.abs(v) < 10 ? 2 : 1)) : String(v ?? "—");
}

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number; color: string; payload: Record<string, unknown> }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1220]/95 px-3 py-2 text-xs shadow-xl">
      {label != null && <div className="mb-1 font-semibold text-slate-100">{String(label)}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-mono font-semibold text-slate-100">{fmt(p.value)}</span>
        </div>
      ))}
      <div className="mt-1 text-[10px] text-slate-500">{unit}</div>
    </div>
  );
}

export function EvidenceChart({ chart, evidence, accent }: { chart: ArticleChart; evidence: EvidenceFile; accent: string }) {
  const table = evidence.tables[chart.table];
  if (!table) return null;
  const rows = table.rows;
  const colors = [accent, SECOND];
  const ref = chart.referenceLine ? evidence.metrics[chart.referenceLine.metric] : undefined;
  const refValue = typeof ref?.value === "number" ? ref.value : undefined;
  const horizontal = chart.type === "bar";
  const height = horizontal ? Math.max(220, rows.length * (chart.series.length > 1 ? 44 : 32) + 70) : 300;
  const multi = chart.series.length > 1;
  const yAxisLabel = { value: chart.unit, angle: -90, position: "insideLeft" as const, fill: INK.muted, fontSize: 10, dx: 4, style: { textAnchor: "middle" as const } };

  let plot: React.ReactElement;
  if (chart.type === "line") {
    plot = (
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey={chart.xKey} tick={tick} tickLine={false} axisLine={{ stroke: INK.grid }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} label={yAxisLabel} />
        <Tooltip content={<ChartTooltip unit={chart.unit} />} cursor={{ stroke: INK.ref, strokeDasharray: "3 3" }} />
        {multi && <Legend wrapperStyle={{ fontSize: 12, color: INK.muted }} />}
        {chart.series.map((s, i) => (
          <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={s.color ?? colors[i]} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: s.color ?? colors[i] }} activeDot={{ r: 5, stroke: "#101726", strokeWidth: 2 }} isAnimationActive={false} />
        ))}
      </LineChart>
    );
  } else if (chart.type === "scatter") {
    plot = (
      <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: 8 }}>
        <CartesianGrid stroke={INK.grid} />
        <XAxis type="number" dataKey={chart.xKey} name={chart.xLabel ?? chart.xKey} tick={tick} tickLine={false} axisLine={{ stroke: INK.grid }} label={{ value: chart.xLabel, position: "insideBottom", offset: -10, fill: INK.muted, fontSize: 10 }} />
        <YAxis type="number" dataKey={chart.series[0].key} name={chart.series[0].label} tick={tick} tickLine={false} axisLine={false} width={44} label={yAxisLabel} />
        <ReferenceLine y={0} stroke={INK.ref} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: INK.ref }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded-lg border border-white/10 bg-[#0b1220]/95 px-3 py-2 text-xs shadow-xl">
                <div className="mb-1 font-semibold text-slate-100">{String((payload[0].payload as Record<string, unknown>).player ?? "")}</div>
                {payload.map((p) => (
                  <div key={String(p.name)} className="text-slate-300">
                    {String(p.name)}: <span className="font-mono font-semibold text-slate-100">{fmt(p.value)}</span>
                  </div>
                ))}
              </div>
            ) : null
          }
        />
        <Scatter data={rows} fill={accent} stroke="#101726" strokeWidth={2} isAnimationActive={false} />
      </ScatterChart>
    );
  } else {
    plot = (
      <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, bottom: 4, left: horizontal ? 4 : 8 }} barGap={2} barCategoryGap={horizontal ? "22%" : "26%"}>
        <CartesianGrid stroke={INK.grid} horizontal={!horizontal} vertical={horizontal} />
        {/* Recharts does not look inside fragments for axes, so these are keyed arrays. */}
        {horizontal
          ? [
              <XAxis key="x" type="number" tick={tick} tickLine={false} axisLine={false} />,
              <YAxis key="y" type="category" dataKey={chart.xKey} tick={{ ...tick, fill: INK.primary }} tickLine={false} axisLine={false} width={112} />,
            ]
          : [
              <XAxis key="x" dataKey={chart.xKey} tick={tick} tickLine={false} axisLine={{ stroke: INK.grid }} interval={rows.length > 10 ? "preserveStartEnd" : 0} minTickGap={8} />,
              <YAxis key="y" tick={tick} tickLine={false} axisLine={false} width={44} label={yAxisLabel} />,
            ]}
        <Tooltip content={<ChartTooltip unit={chart.unit} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
        {multi && <Legend wrapperStyle={{ fontSize: 12, color: INK.muted }} />}
        {refValue != null &&
          (horizontal ? (
            <ReferenceLine x={refValue} stroke={INK.ref} strokeDasharray="4 4" label={{ value: chart.referenceLine!.label, fill: INK.muted, fontSize: 10, position: "top" }} />
          ) : (
            <ReferenceLine y={refValue} stroke={INK.ref} strokeDasharray="4 4" label={{ value: chart.referenceLine!.label, fill: INK.muted, fontSize: 10, position: "insideTopRight" }} />
          ))}
        {chart.series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? colors[i]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 34} isAnimationActive={false} />
        ))}
      </BarChart>
    );
  }

  const cols = Object.keys(rows[0] ?? {});
  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#101726]" aria-label={chart.ariaLabel} data-evidence-chart={chart.id}>
      <figcaption className="space-y-1 border-b border-white/[0.06] px-4 pb-3 pt-3.5">
        <div className="text-sm font-semibold text-slate-100 sm:text-[15px]">{chart.title}</div>
        {chart.subtitle && <div className="text-xs text-slate-400">{chart.subtitle}</div>}
      </figcaption>
      <div className="px-2 pt-3 sm:px-3" role="img" aria-label={chart.ariaLabel}>
        <ResponsiveContainer width="100%" height={height}>
          {plot}
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 px-4 pb-3.5 pt-1">
        <p className="text-[13px] leading-relaxed text-slate-300">
          <span className="font-semibold text-slate-100">Takeaway: </span>
          <TokenText text={chart.takeaway} evidence={evidence} />
        </p>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Unit: {chart.unit}. Source: {table.dataset}. Filters: {table.filters}. Sample: {table.sampleSize.n.toLocaleString("en-IN")} {table.sampleSize.unit}. Chart: CricField Editorial Desk.
        </p>
        <details className="group text-xs">
          <summary className="cursor-pointer select-none text-slate-400 hover:text-slate-200">View the data</summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-white/[0.06]">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-[#141d30] text-slate-400">
                <tr>{cols.map((c) => <th key={c} scope="col" className="px-2.5 py-1.5 font-medium">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono text-slate-300">
                {rows.map((r, i) => (
                  <tr key={i}>{cols.map((c) => <td key={c} className="whitespace-nowrap px-2.5 py-1">{fmt(r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </figure>
  );
}
