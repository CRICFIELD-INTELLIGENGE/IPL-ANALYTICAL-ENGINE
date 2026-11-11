import React from "react";
import { ShieldCheck, AlertCircle, HelpCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CI_METHOD, type RatingMetric, type ScoutRole } from "@/lib/scout-api";

export function SampleTierBadge({ tier, balls }: { tier: "rankable" | "low" | "insufficient" | string; balls?: number }) {
  if (tier === "rankable") {
    return (
      <span
        title="Rankable Sample: at least 120 balls in the selected competition, phase and window."
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30"
      >
        <ShieldCheck className="w-3 h-3 text-sky-400" />
        Verified Sample {balls != null && <span className="opacity-70 font-mono text-[9px]">({balls}b)</span>}
      </span>
    );
  }

  if (tier === "low") {
    return (
      <span
        title="Low Sample: 60–119 balls."
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30"
      >
        <AlertCircle className="w-3 h-3 text-amber-400" />
        Emerging {balls != null && <span className="opacity-70 font-mono text-[9px]">({balls}b)</span>}
      </span>
    );
  }

  return (
    <span
      title="Limited Sample: fewer than 60 balls."
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/50 border border-white/10"
    >
      <HelpCircle className="w-3 h-3 text-white/40" />
      Small Sample {balls != null && <span className="opacity-70 font-mono text-[9px]">({balls}b)</span>}
    </span>
  );
}

export function ShrunkIndexBadge({
  metric,
  label,
  invertBetter = false,
}: {
  metric?: RatingMetric | null;
  label?: string;
  invertBetter?: boolean;
}) {
  if (!metric || metric.shrunk == null) {
    return <span className="text-white/30 text-xs font-mono">—</span>;
  }

  const val = metric.shrunk;
  const isAbove = val > 100.5;
  const isBelow = val < 99.5;
  const isPositive = invertBetter ? isBelow : isAbove;
  const isNegative = invertBetter ? isAbove : isBelow;

  const colorClass = isPositive
    ? "text-orange-400 bg-orange-500/10 border-orange-500/25"
    : isNegative
    ? "text-rose-400 bg-rose-500/10 border-rose-500/25"
    : "text-white/70 bg-white/5 border-white/10";

  return (
    <div className="inline-flex flex-col items-end">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono text-xs font-black ${colorClass}`}
        title={`League-Adjusted Rating: ${val.toFixed(1)} (100 = Competition Baseline). Raw: ${metric.value?.toFixed(1) ?? "—"}`}
      >
        {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        {val.toFixed(1)}
      </span>
      {metric.percentile != null && (
        <span className="text-[9px] font-bold text-white/50 tracking-tighter mt-0.5">
          {Math.round(metric.percentile)}th %ile
        </span>
      )}
    </div>
  );
}

export function ConfidenceIntervalBadge({ ci, metricId }: { ci?: [number, number] | null; metricId?: string }) {
  if (!ci || ci[0] == null || ci[1] == null || !Number.isFinite(ci[0])) {
    return <span className="text-white/30 text-xs font-mono" title="No interval">—</span>;
  }
  const hi = Number.isFinite(ci[1]) ? ci[1].toFixed(1) : "∞";

  return (
    <span
      className="inline-flex items-center text-[10px] font-mono text-white/60 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"
      title={`Range: ${ci[0].toFixed(1)} to ${hi}`}
    >
      [{ci[0].toFixed(1)}–{hi}]
    </span>
  );
}

export function RolePill({ role }: { role?: ScoutRole | string | null }) {
  const label = typeof role === "string" ? role : role?.label;
  if (!label || !label.trim()) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border bg-white/5 text-white/40 border-white/10">
        Specialist
      </span>
    );
  }
  const formatted = label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const isOpenerOrTop = /opener|top/i.test(label);
  const isFinisher = /finisher|death/i.test(label);
  const isSpecialist = /specialist|powerplay/i.test(label);
  const isAllRounder = /all_rounder|all-rounder/i.test(label);

  let style = "bg-primary/10 text-primary border-primary/30";
  if (isOpenerOrTop) style = "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (isFinisher) style = "bg-orange-500/15 text-orange-300 border-orange-500/30";
  if (isSpecialist) style = "bg-purple-500/15 text-purple-300 border-purple-500/30";
  if (isAllRounder) style = "bg-sky-500/15 text-sky-300 border-sky-500/30";

  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border ${style}`}>
      {formatted}
    </span>
  );
}
