import { useRef, useState, type ReactNode } from "react";

export interface SwipeSlide { key: string; label: string; tone: string; body: ReactNode }

/** One card, several panels side by side: swipe (or scroll) between them, or tap a tab. */
export function SwipeCard({ slides, className, label = "Strengths and concerns" }: { slides: SwipeSlide[]; className: string; label?: string }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (i: number) => { const el = track.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); setActive(i); };
  return (
    <div className={`${className} flex flex-col gap-3`}>
      <div className="flex items-center justify-between gap-2" role="tablist" aria-label={label}>
        <div className="flex gap-1.5">{slides.map((s, i) => (
          <button key={s.key} type="button" role="tab" aria-selected={active === i} onClick={() => go(i)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${active === i ? `bg-white/10 ${s.tone}` : "text-white/45 hover:text-white"}`}>{s.label}</button>
        ))}</div>
        <div className="flex items-center gap-1" aria-hidden>{slides.map((s, i) => <span key={s.key} className={`h-1.5 rounded-full transition-all ${active === i ? "w-4 bg-white/70" : "w-1.5 bg-white/25"}`} />)}</div>
      </div>
      <div ref={track} onScroll={(e) => { const el = e.currentTarget; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (i !== active) setActive(i); }}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-1">
        {slides.map((s, i) => <div key={s.key} role="tabpanel" aria-label={s.label} aria-hidden={active !== i} className="w-full shrink-0 snap-start px-1 min-w-0">{s.body}</div>)}
      </div>
      <p className="text-[10px] text-white/35 text-center">Swipe for {slides[(active + 1) % slides.length].label.toLowerCase()} →</p>
    </div>
  );
}
