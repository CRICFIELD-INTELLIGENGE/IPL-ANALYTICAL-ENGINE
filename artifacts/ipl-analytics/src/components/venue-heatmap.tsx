import { MapPin } from "lucide-react";

const VENUES = [
  { name: "Chepauk", type: "Spin Friendly", value: 76, color: "bg-orange-500" },
  { name: "Eden Gardens", type: "Spin Friendly", value: 68, color: "bg-orange-500" },
  { name: "Wankhede", type: "Pace Friendly", value: 64, color: "bg-blue-500" },
];

export function VenueHeatmap() {
  return (
    <div className="premium-card rounded-[14px] p-[14px] h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div />
        <MapPin className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 flex gap-4 min-h-0 items-center">
        <div className="flex-1 h-full relative rounded-xl overflow-hidden bg-black/40 border border-white/10">
          <img
            src="/venue heatmap.png"
            alt="Venue Heatmap"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-24 flex flex-col gap-2.5 justify-center">
          {VENUES.map(v => (
            <div key={v.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[7px] font-semibold uppercase tracking-widest text-white/70">
                <span className="truncate max-w-[50px]">{v.name}</span>
                <span>{v.value}%</span>
              </div>
              <div className="h-[4px] rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full ${v.color} shadow-lg shadow-primary/20`} style={{ width: `${v.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
