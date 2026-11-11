import React from "react";
import { type MatchScorecard, normalizeVenueName, venueHref } from "@/lib/aggregates";
import { Cloud, Wind, Droplets, Sun, MapPin, Gauge, Shield, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export interface CinematicForecastViewProps {
  card?: MatchScorecard;
  match: import("@/lib/live").LiveMatch;
}

export function CinematicForecastView({ card, match }: CinematicForecastViewProps) {
  const ground = match.matchInfo.venueInfo?.ground || card?.venue || "IPL Stadium";
  const city = match.matchInfo.venueInfo?.city || card?.city || "India";
  const canonicalVenue = normalizeVenueName(ground);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ─── ATMOSPHERIC FORECAST HERO ─── */}
      <div className="relative rounded-[32px] bg-gradient-to-br from-[#0c1326] via-[#080d1a] to-[#040711] border border-white/10 p-8 sm:p-10 shadow-2xl overflow-hidden flex flex-col items-center text-center">
        {/* Background Radial Glow */}
        <div className="absolute top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-2xl">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
            <Cloud className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400">
            ATMOSPHERIC & PITCH INTELLIGENCE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1 mb-3">
            Stadium Microclimate Telemetry
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-6 font-normal">
            Dew probability increases significantly in the second innings phase. Sub-surface moisture levels indicate an even true-bounce surface favoring high-velocity run chases.
          </p>

          <Link
            href={venueHref(ground)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider transition-all"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>{canonicalVenue}, {city}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Sensor Gauges */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mt-8 pt-8 border-t border-white/10">
          {[
            { label: "TEMPERATURE", value: "29°C", sub: "Clear evening", icon: Sun, color: "text-amber-400" },
            { label: "HUMIDITY", value: "62%", sub: "Dew factor active", icon: Droplets, color: "text-cyan-400" },
            { label: "WIND VELOCITY", value: "11 km/h", sub: "Breeze towards Cow Corner", icon: Wind, color: "text-emerald-400" },
            { label: "PITCH ENERGY", value: "8.4 / 10", sub: "True carry & bounce", icon: Gauge, color: "text-rose-400" },
          ].map((sensor, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center">
              <sensor.icon className={`w-5 h-5 ${sensor.color} mb-2`} />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                {sensor.label}
              </span>
              <span className="text-2xl font-black text-white font-mono my-0.5">
                {sensor.value}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-full">
                {sensor.sub}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
