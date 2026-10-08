import React, { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { VenueAnalyticsDashboard } from "@/components/venue-analytics-dashboard";
import { VenueIntelPanel } from "@/components/decision/intel-panels";
import { 
  ArrowLeft, MapPin, Activity, Calendar, Trophy, 
  TrendingUp, Compass, Flag, Target, Crosshair
} from "lucide-react";
import { useVenues, useMatches, teamColor, teamShort, normalizeVenueName, venueSlug, venueImage, venueHue } from "@/lib/aggregates";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";

/**
 * Percentage text that tolerates a missing/non-numeric stat. The venues API
 * doesn't guarantee every field for every ground, and a bare `.toFixed()` on
 * an absent one used to blank the whole page with a render crash.
 */
const pctText = (value: unknown, digits = 1): string =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";

export default function VenueProfilePage() {
  const [, params] = useRoute("/venues/:slug");
  const slug = params?.slug || "";

  const venues = useVenues();
  const matches = useMatches();

  const [activeSubTab, setActiveSubTab] = useState<"overview" | "history">("overview");

  // Resolve the slug through the same canonical naming the stats page links
  // with, then combine every API row that maps to that ground. One physical
  // venue is split across several rows (e.g. "Maharashtra Cricket Association
  // Stadium" and "…Stadium, Pune"), so matching a single row both picked the
  // wrong venue for canonical slugs like /venues/mca-stadium and reported only
  // part of its history.
  const venueData = useMemo(() => {
    if (!venues.data || !slug) return null;
    const wanted = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const group = venues.data.filter(v => venueSlug(v.venue || "") === wanted);
    if (group.length === 0) return null;

    const canonical = normalizeVenueName(group[0].venue || "");
    const totalMatches = group.reduce((sum, v) => sum + (Number(v.matches) || 0), 0);
    // Weight each row's averages/percentages by how many matches it covers.
    const weighted = (pick: (v: any) => number) => {
      if (totalMatches === 0) return undefined;
      const sum = group.reduce((acc, v) => {
        const val = pick(v);
        return acc + (Number.isFinite(val) ? val * (Number(v.matches) || 0) : 0);
      }, 0);
      return Math.round((sum / totalMatches) * 10) / 10;
    };

    return {
      venue: canonical,
      city: group.find(v => (v as any).city)?.["city" as keyof typeof group[0]] as string | undefined,
      matches: totalMatches,
      avg1stInn: weighted(v => Number((v as any).avg1stInn)),
      avg2ndInn: weighted(v => Number((v as any).avg2ndInn)),
      battingFirstWinPct: weighted(v => Number((v as any).battingFirstWinPct)),
      chasingWinPct: weighted(v => Number((v as any).chasingWinPct)),
      tossDecisionFieldPct: weighted(v => Number((v as any).tossDecisionFieldPct)),
      tossWinPct: weighted(v => Number((v as any).tossWinPct)),
    };
  }, [venues.data, slug]);

  const venueMatches = useMemo(() => {
    if (!matches.data || !venueData) return [];
    const target = normalizeVenueName(venueData.venue || "");
    return matches.data
      .filter(m => m.venue && normalizeVenueName(m.venue) === target)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [matches.data, venueData]);

  // An unknown slug should say so, not silently render a different ground.
  if (!venues.isLoading && venues.data && !venueData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
          <MapPin className="w-10 h-10 text-white/20" />
          <span className="text-sm font-black uppercase tracking-[0.2em] text-white/60">Venue not found</span>
          <Link href="/stats">
            <button className="mt-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
              Back to stats center
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (venues.isLoading || !venueData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-sm font-black uppercase tracking-[0.2em] text-primary">Loading Venue Intelligence...</span>
        </div>
      </Layout>
    );
  }

  const stadiumName = venueData.venue;
  // Prefer the city the API actually recorded; the canonical venue name has
  // its city qualifier stripped, so there's nothing to split out of it.
  const cityName = venueData.city?.trim() || "";
  const heroImage = venueImage(stadiumName);
  const heroHue = venueHue(stadiumName);

  const num = (v: number | undefined): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  // Pie chart data for win percentages
  const winData = [
    { name: "Batting First", value: Math.round(num(venueData.battingFirstWinPct)) },
    { name: "Chasing", value: Math.round(num(venueData.chasingWinPct)) },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))"];

  return (
    <Layout>
      <div className="space-y-6 pb-12 px-4 max-w-7xl mx-auto animate-fade-in">
        
        {/* HEADER NAVIGATION */}
        <div className="flex items-center justify-between shrink-0">
          <Link href="/stats">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-white transition-all">
              <ArrowLeft className="w-4 h-4 text-primary" />
              Back to stats center
            </button>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Venue Intelligence</span>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          </div>
        </div>

        {/* HERO — the ground's photograph carries the header rather than
            sitting in a small square beside it. */}
        <div className="relative rounded-[24px] overflow-hidden border border-white/10 shadow-2xl">
          <div className="absolute inset-0">
            {heroImage ? (
              <img src={heroImage} className="w-full h-full object-cover" alt={stadiumName} />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: `linear-gradient(135deg, hsl(${heroHue} 45% 26%), hsl(${heroHue} 40% 10%))` }}
              />
            )}
            {/* Two passes: a vertical fade so the name sits on solid tone, and a
                left-weighted one so the copy column stays readable regardless of
                what the photograph happens to contain. */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/75 to-[#050816]/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/50 to-transparent" />
          </div>

          <div className="relative z-10 p-6 md:p-8 pt-24 md:pt-32">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-white/80 flex items-center gap-1.5 backdrop-blur-sm">
                <Compass className="w-3 h-3" />
                IPL Venue
              </span>
              {cityName && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/15 border border-primary/25 text-primary flex items-center gap-1.5 backdrop-blur-sm">
                  <MapPin className="w-3 h-3" />
                  {cityName}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/60 backdrop-blur-sm">
                {venueData.matches} {venueData.matches === 1 ? "match" : "matches"}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg">
              {stadiumName}
            </h1>

            {/* Headline numbers sit on the banner itself so the page opens with
                the ground's character rather than a wall of tiles. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 max-w-3xl">
              {[
                { label: "Avg 1st Innings", value: String(Math.round(num(venueData.avg1stInn))), tint: "hsl(var(--primary))" },
                { label: "Avg 2nd Innings", value: String(Math.round(num(venueData.avg2ndInn))) },
                { label: "Bat First Win", value: pctText(venueData.battingFirstWinPct) },
                { label: "Chase Win", value: pctText(venueData.chasingWinPct), tint: "hsl(var(--accent))" },
              ].map(s => (
                <div
                  key={s.label}
                  className="bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-md"
                >
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/45">{s.label}</div>
                  <div className="text-2xl font-black mt-0.5 tabular-nums" style={s.tint ? { color: s.tint } : { color: "#fff" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decision Intelligence: recent vs all-time profile from the ball-by-ball warehouse */}
        <VenueIntelPanel venue={stadiumName} />

        {/* SUB TAB BAR */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeSubTab === "overview"
                ? "bg-gradient-to-r from-primary/40 to-blue-500/20 text-white shadow-[0_0_16px_-4px_hsl(var(--primary))]"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-4 h-4" />
            Pitch Analytics
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeSubTab === "history"
                ? "bg-gradient-to-r from-primary/40 to-blue-500/20 text-white shadow-[0_0_16px_-4px_hsl(var(--primary))]"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Match History
          </button>
        </div>

        {/* PROFILE CONTENT AREA */}
        {/* No `mode="wait"`: it holds the outgoing tab's snapshot until its
            exit animation finishes, and when that exit gets interrupted the
            old content stays mounted forever — the tab button would light up
            while the panel below still showed the previous tab. Cross-fading
            without waiting keeps the transition but can't get stuck. */}
        <AnimatePresence>
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            
            {activeSubTab === "overview" && (
              <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Innings Comparison Chart */}
                <GlassCard className="lg:col-span-2 p-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Innings Run Profile
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: "1st Innings", runs: Math.round(num(venueData.avg1stInn)) },
                        { name: "2nd Innings", runs: Math.round(num(venueData.avg2ndInn)) }
                      ]} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          contentStyle={{ backgroundColor: '#0A0D1A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="runs" radius={[6, 6, 0, 0]}>
                          {
                            [0, 1].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                {/* Toss & Win Probabilities */}
                <div className="space-y-6">
                  <GlassCard className="p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Win Probability By Target
                    </h3>
                    <div className="h-[180px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={winData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {winData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0A0D1A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                        <span className="text-[10px] font-bold text-white/40 uppercase">Bat First</span>
                        <span className="text-lg font-black text-white">{pctText(venueData.battingFirstWinPct, 0)}</span>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                      <Flag className="w-4 h-4 text-primary" />
                      Captain's Toss Decisions
                    </h3>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl mb-3">
                      <span className="text-xs font-bold text-white/60">Choose to Field</span>
                      <span className="text-lg font-black text-accent">{pctText(venueData.tossDecisionFieldPct)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                      <span className="text-xs font-bold text-white/60">Choose to Bat</span>
                      <span className="text-lg font-black text-primary">
                        {typeof venueData.tossDecisionFieldPct === "number" && Number.isFinite(venueData.tossDecisionFieldPct)
                          ? pctText(100 - venueData.tossDecisionFieldPct)
                          : "—"}
                      </span>
                    </div>
                  </GlassCard>
                </div>
              </div>
                {/* Analyst hub: phase profile, surface behaviour, par curve,
                    ground leaders and the second-innings time-of-day shift. */}
                <VenueAnalyticsDashboard venue={stadiumName} />
              </div>
            )}

            {activeSubTab === "history" && (
              <GlassCard className="p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-6 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Recent Matches at {stadiumName}
                </h3>
                
                <div className="space-y-3">
                  {venueMatches.length > 0 ? (
                    venueMatches.map(match => (
                      <div key={match.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/30 hover:bg-white/[0.04] transition-all group">
                        
                        <div className="flex items-center gap-6 flex-1 mb-4 md:mb-0">
                          {/* Date Block */}
                          <div className="flex flex-col text-center w-16 shrink-0 border-r border-white/10 pr-4">
                            <span className="text-[10px] font-black uppercase text-white/40">{new Date(match.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-xl font-black text-white">{new Date(match.date).getDate()}</span>
                            <span className="text-[10px] font-bold text-white/40">{new Date(match.date).getFullYear()}</span>
                          </div>
                          
                          {/* Teams */}
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex flex-col items-end flex-1">
                              <span className="text-xs md:text-sm font-bold text-white line-clamp-1 text-right">{match.team1}</span>
                              <span className="text-[10px] font-black text-white/40">{match.team1Score || "-"}</span>
                            </div>
                            
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-black text-white/50">VS</span>
                            </div>
                            
                            <div className="flex flex-col items-start flex-1">
                              <span className="text-xs md:text-sm font-bold text-white line-clamp-1">{match.team2}</span>
                              <span className="text-[10px] font-black text-white/40">{match.team2Score || "-"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Result Block */}
                        <div className="flex flex-col items-end pl-0 md:pl-6 shrink-0 w-full md:w-48">
                          {match.winner ? (
                            <>
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Winner</span>
                              <span className="text-xs font-bold text-white text-right line-clamp-1">{match.winner}</span>
                              <span className="text-[10px] font-medium text-white/60 text-right">{match.margin}</span>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-white/60">No Result</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <span className="text-sm font-bold text-white/40">No match history available for this venue.</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
