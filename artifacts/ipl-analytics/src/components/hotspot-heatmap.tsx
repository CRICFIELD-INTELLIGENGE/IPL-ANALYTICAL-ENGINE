/**
 * Stadium Hotspot Heatmap — 6x6 grid showing scoring intensity
 * derived from real over-by-over run rate distribution patterns.
 */
import { useMemo } from "react";

export function HotspotHeatmap({
  data,
  title = "Stadium Hotspot",
  subtitle = "Run intensity zones",
}: {
  data: number[][]; // 6x6 grid of values 0..1
  title?: string;
  subtitle?: string;
}) {
  const max = useMemo(() => Math.max(...data.flat(), 0.01), [data]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-sm font-display font-bold">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Cool</span>
          <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-blue-500/60 via-purple-500/70 to-pink-500" />
          <span className="text-[10px] text-muted-foreground">Hot</span>
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-[300px] mx-auto">
        {/* Field outline */}
        <div className="absolute inset-0 rounded-full border border-white/10 bg-gradient-to-br from-emerald-950/40 to-emerald-900/10" />
        <div className="absolute inset-[20%] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-amber-400/80 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_hsl(38_92%_50%)]" />

        {/* Hotspot cells */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-px p-2">
          {data.map((row, ri) =>
            row.map((v, ci) => {
              const t = v / max;
              const opacity = 0.1 + t * 0.85;
              // hue from blue (220) -> pink (320) as intensity rises
              const hue = 220 + t * 100;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className="rounded-sm transition-all"
                  style={{
                    background: `hsla(${hue}, 90%, 60%, ${opacity})`,
                    boxShadow: t > 0.7 ? `0 0 8px hsla(${hue}, 90%, 60%, 0.6)` : undefined,
                  }}
                  title={`Zone (${ri + 1},${ci + 1}): ${(t * 100).toFixed(0)}% intensity`}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
