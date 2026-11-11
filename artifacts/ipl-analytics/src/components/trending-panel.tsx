import { Flame } from "lucide-react";

const TRENDING = [
  { tag: "Match", title: "Dhoni finishes in style again", mentions: "12.4K+ mentions", color: "text-orange-400", hot: true },
  { tag: "Records", title: "RCB breaks chase record", mentions: "9.8K+ mentions", color: "text-pink-400", hot: true },
  { tag: "Strategy", title: "Youngsters lighting up IPL 2026", mentions: "8.1K+ mentions", color: "text-purple-400", hot: true },
  { tag: "Compare", title: "Impact Player rule debate", mentions: "5.3K+ mentions", color: "text-blue-400", hot: true },
];

export function TrendingPanel() {
  return (
    <div className="h-full premium-card rounded-[14px] p-4 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-accent" />
          <div className="font-display font-black text-[10px] uppercase tracking-widest text-white">Trending Hub</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        {TRENDING.map((t, i) => (
          <button
            key={i}
            className="group text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[8px] uppercase tracking-widest font-black ${t.color}`}>{t.tag}</span>
              {t.hot && <span className="text-[10px]">🔥</span>}
            </div>
            <div className="text-[12px] font-black leading-tight text-white group-hover:text-primary transition-colors">{t.title}</div>
            <div className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{t.mentions}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
