import { Flame } from "lucide-react";

const TRENDING = [
  { tag: "Match", title: "Dhoni finishes in style again", mentions: "12.4K+ mentions", color: "text-orange-400" },
  { tag: "Records", title: "RCB breaks chase record", mentions: "9.8K+ mentions", color: "text-pink-400" },
  { tag: "Strategy", title: "Youngsters lighting up IPL 2026", mentions: "8.1K+ mentions", color: "text-purple-400" },
  { tag: "Compare", title: "Impact Player rule debate", mentions: "5.3K+ mentions", color: "text-blue-400" },
];

export function TrendingPanel() {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-accent" />
          <div className="font-display font-semibold">TRENDING NOW</div>
        </div>
        <button className="text-xs text-primary hover:underline">View All</button>
      </div>
      <div className="flex flex-col">
        {TRENDING.map((t, i) => (
          <button
            key={i}
            className="group text-left py-2.5 border-t border-white/5 first:border-t-0 hover:bg-white/3 transition-colors -mx-1 px-1 rounded"
          >
            <div className="flex items-baseline gap-2">
              <span className={`text-[10px] uppercase tracking-wider font-mono ${t.color}`}>{t.tag}</span>
            </div>
            <div className="text-sm font-medium leading-snug group-hover:text-white">{t.title}</div>
            <div className="text-[11px] text-muted-foreground">{t.mentions}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
