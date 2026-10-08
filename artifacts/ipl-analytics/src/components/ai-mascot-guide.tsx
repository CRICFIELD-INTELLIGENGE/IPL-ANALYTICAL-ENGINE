import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Compass,
  MapPin,
  HelpCircle,
  Play,
  Search,
  ExternalLink,
  Shield,
  BarChart2,
  Gavel,
  Zap,
  Activity,
  Layers,
  Radio,
  Tv,
  CheckCircle2
} from "lucide-react";
import { useTeamTheme } from "@/lib/team-context";
import { getClipRoute, searchAndOpenClip, type ClipRouteResponse } from "@/lib/clip-router";

const STORAGE_DISMISS_KEY = "beyond_xi_mascot_tour_dismissed";

interface TourStep {
  step: number;
  title: string;
  category: "IPL Intelligence OS" | "Beyond XI" | "AI Analyst";
  description: string;
  route: string;
  actionText: string;
  icon: any;
  color: string;
  tip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: "My Dugout: Your Club Sanctum",
    category: "Beyond XI",
    description: "Select your franchise in the top header. Your Dugout adapts with team colors, 18-season era timelines (2008–2026), arch-rivalry pulses, and Fan Parliament voting.",
    route: "/dugout",
    actionText: "Visit My Dugout →",
    icon: Shield,
    color: "text-amber-400",
    tip: "Tip: Change your franchise anytime using the crest picker in the top bar!"
  },
  {
    step: 2,
    title: "Advanced Stats & Scorecards",
    category: "IPL Intelligence OS",
    description: "Explore 280,000+ legal deliveries across 1,243 completed matches. Use the dimensional slicer for death overs economy (16–20), true strike rates, and head-to-head match-ups.",
    route: "/stats",
    actionText: "Open Stats Terminal →",
    icon: BarChart2,
    color: "text-cyan-400",
    tip: "Tip: Filter by venue or overs phase to find hidden match-winning bowler spells."
  },
  {
    step: 3,
    title: "Auction War Room Simulator",
    category: "Beyond XI",
    description: "Step into the selector's shoes with a ₹120.00 Cr salary cap. Bid against 9 AI franchise bot algorithms, manage squad overseas quotas, and lock in your championship Playing XI.",
    route: "/auction",
    actionText: "Launch Auction OS →",
    icon: Gavel,
    color: "text-emerald-400",
    tip: "Tip: Watch out for overseas fast-bowler bidding wars in round two!"
  },
  {
    step: 4,
    title: "12 AI Tactical Decision Engines",
    category: "AI Analyst",
    description: "Beyond simple chatbots: simulate alternate reality Monte Carlo what-if branches, detect bowler weaknesses, and evaluate the Dew & Ball Wear Impact Matrix across venues.",
    route: "/ai-analyst",
    actionText: "Enter Decision Cockpit →",
    icon: Sparkles,
    color: "text-purple-400",
    tip: "Tip: Replay historic finals and test what happens if Bumrah bowled the last over."
  },
  {
    step: 5,
    title: "Match Pulse & Official Highlights",
    category: "IPL Intelligence OS",
    description: "Watching live or browsing archives? Use Second Screen for real-time win probability and emotional heat, and jump directly to official JioHotstar match highlights.",
    route: "/pulse",
    actionText: "Open Second Screen →",
    icon: Radio,
    color: "text-rose-400",
    tip: "Tip: Use natural language below to find and launch any landmark IPL clip!"
  }
];

export function AIMascotGuide() {
  const [, setLocation] = useLocation();
  const { selectedTeam, theme } = useTeamTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tour" | "map" | "ask">("tour");
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);

  // Natural language query state for Ask/Clip Finder
  const [askQuery, setAskQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [clipResult, setClipResult] = useState<ClipRouteResponse | null>(null);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_DISMISS_KEY);
      if (dismissed === "true") {
        setBubbleDismissed(true);
      }
    } catch (_e) {}
  }, []);

  const handleDismissBubble = () => {
    setBubbleDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_DISMISS_KEY, "true");
    } catch (_e) {}
  };

  const handleSkipTour = () => {
    setIsOpen(false);
    handleDismissBubble();
  };

  const handleFindClip = async (queryText?: string) => {
    const q = queryText || askQuery;
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      const res = await getClipRoute(q);
      setClipResult(res);
    } catch (_err) {
      setClipResult({ matched: false, clip_id: null, title: null, url: null });
    } finally {
      setIsSearching(false);
    }
  };

  const currentStep = TOUR_STEPS[currentStepIdx];

  const teamGreeting = selectedTeam
    ? `${selectedTeam} Dugout Active`
    : "IPL Intelligence OS";

  return (
    <div className="fixed bottom-5 right-5 z-[1000] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto relative">
        {/* ═════════════════════════════════════════════════════════════════
            1. FLOATING CHAT BUBBLE PROMPT (WHEN COLLAPSED)
           ═════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {!isOpen && !bubbleDismissed && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="mb-2.5 max-w-[260px] p-3 rounded-2xl bg-[#070B18]/95 backdrop-blur-xl border border-cyan-500/30 text-white shadow-2xl relative"
            >
              <button
                onClick={handleDismissBubble}
                className="absolute top-1.5 right-1.5 text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="flex items-start gap-2.5">
                <span className="text-base leading-none">🏏</span>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                    Gully AI • Platform Guide
                  </div>
                  <p className="text-[11px] text-white/80 leading-snug">
                    New to Beyond XI? Tap me for a 30-sec feature walkthrough!
                  </p>
                  <button
                    onClick={() => {
                      setIsOpen(true);
                      handleDismissBubble();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-300 hover:text-white pt-1 transition-colors cursor-pointer"
                  >
                    <span>Start Quick Tour</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═════════════════════════════════════════════════════════════════
            2. EXPANDED GUIDE / CHATBOT WIDGET MODAL
           ═════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-[92vw] sm:w-[420px] max-h-[85vh] rounded-3xl bg-[#070B18]/95 backdrop-blur-2xl border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden mb-3 relative"
              style={{
                boxShadow: theme?.glow
                  ? `0 15px 40px ${theme.glow}, 0 2px 10px rgba(0,0,0,0.8)`
                  : undefined
              }}
            >
              {/* Top Mascot Header */}
              <div
                className="p-4 border-b border-white/10 flex items-center justify-between relative overflow-hidden"
                style={{
                  background: theme?.surfaceTint
                    ? `linear-gradient(to right, ${theme.surfaceTint}, transparent)`
                    : "linear-gradient(to right, rgba(139,92,246,0.15), transparent)"
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Cyber Cricket Avatar */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md relative shrink-0"
                    style={{
                      backgroundColor: theme?.accent ? `${theme.accent}22` : "rgba(6,182,212,0.2)",
                      borderColor: theme?.accent ? `${theme.accent}66` : "rgba(6,182,212,0.4)"
                    }}
                  >
                    <span className="text-xl">🤖</span>
                    <div
                      className="w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 animate-pulse"
                      style={{ backgroundColor: theme?.accent || "#06B6D4" }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">
                        Gully AI
                      </h3>
                      <span className="text-[9px] font-mono text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-cyan-500/20">
                        GUIDE BOT
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50 font-mono">
                      {teamGreeting}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSkipTour}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                    title="Close Guide"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center px-4 pt-3 border-b border-white/10 gap-2">
                {[
                  { id: "tour", label: "Interactive Tour", icon: Compass },
                  { id: "map", label: "Page Map", icon: Layers },
                  { id: "ask", label: "Clip Navigator", icon: Search },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setActiveTab(tb.id as any)}
                    className={`pb-2.5 px-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                      activeTab === tb.id
                        ? "border-cyan-400 text-cyan-300"
                        : "border-transparent text-white/40 hover:text-white"
                    }`}
                  >
                    <tb.icon className="w-3.5 h-3.5" />
                    <span>{tb.label}</span>
                  </button>
                ))}
              </div>

              {/* Body Content */}
              <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed custom-scrollbar">
                {/* ─── TAB 1: INTERACTIVE TOUR ─── */}
                {activeTab === "tour" && (
                  <div className="space-y-4">
                    {/* Stepped Progress Pills */}
                    <div className="flex items-center gap-1">
                      {TOUR_STEPS.map((s, i) => (
                        <button
                          key={s.step}
                          onClick={() => setCurrentStepIdx(i)}
                          className={`flex-1 h-1.5 rounded-full transition-all cursor-pointer ${
                            i === currentStepIdx
                              ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                              : i < currentStepIdx
                              ? "bg-white/40"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Active Step Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-black uppercase tracking-widest text-white/40">
                          FEATURE {currentStep.step} OF {TOUR_STEPS.length} • {currentStep.category}
                        </span>
                        <currentStep.icon className={`w-4 h-4 ${currentStep.color}`} />
                      </div>

                      <h4 className="text-sm font-black text-white uppercase tracking-tight">
                        {currentStep.title}
                      </h4>

                      <p className="text-[11px] text-white/70 leading-relaxed">
                        {currentStep.description}
                      </p>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[10px] text-white/60 font-mono">
                        {currentStep.tip}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            setLocation(currentStep.route);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <span>{currentStep.actionText}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            disabled={currentStepIdx === 0}
                            onClick={() => setCurrentStepIdx(p => Math.max(0, p - 1))}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white cursor-pointer"
                            title="Previous"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={currentStepIdx === TOUR_STEPS.length - 1}
                            onClick={() => setCurrentStepIdx(p => Math.min(TOUR_STEPS.length - 1, p + 1))}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white cursor-pointer"
                            title="Next"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-1">
                      <button
                        onClick={handleSkipTour}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        Skip Tour
                      </button>
                      <span>Press any step above to jump</span>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: PAGE MAP SHORTCUTS ─── */}
                {activeTab === "map" && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-white/60">
                      Teleport directly to any destination across the 3 connected layers:
                    </p>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold block mb-1.5">
                          1. IPL INTELLIGENCE OS
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Stats Terminal", route: "/stats", icon: BarChart2 },
                            { name: "Scorebook Archive", route: "/scores", icon: Zap },
                            { name: "Visuals Lab", route: "/visualizations", icon: Activity },
                            { name: "2027 Intel", route: "/feed", icon: Activity },
                          ].map(item => (
                            <button
                              key={item.route}
                              onClick={() => {
                                setIsOpen(false);
                                setLocation(item.route);
                              }}
                              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-white/20 text-left transition-all cursor-pointer flex items-center justify-between group"
                            >
                              <span className="text-[11px] font-bold text-white group-hover:text-cyan-300">
                                {item.name}
                              </span>
                              <ChevronRight className="w-3 h-3 text-white/30 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1.5">
                          2. BEYOND XI FAN HUB
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "My Dugout", route: "/dugout", icon: Shield },
                            { name: "Auction War Room", route: "/auction", icon: Gavel },
                            { name: "Beyond XI Arena", route: "/arena", icon: Compass },
                            { name: "Cardverse Deck", route: "/shop", icon: Layers },
                          ].map(item => (
                            <button
                              key={item.route}
                              onClick={() => {
                                setIsOpen(false);
                                setLocation(item.route);
                              }}
                              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-white/20 text-left transition-all cursor-pointer flex items-center justify-between group"
                            >
                              <span className="text-[11px] font-bold text-white group-hover:text-amber-300">
                                {item.name}
                              </span>
                              <ChevronRight className="w-3 h-3 text-white/30 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-purple-400 font-bold block mb-1.5">
                          3. AI ANALYST & SECOND SCREEN
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: "Decision Engines", route: "/ai-analyst", icon: Sparkles },
                            { name: "Second Screen Pulse", route: "/pulse", icon: Radio },
                            { name: "Time Machine", route: "/ai-analyst/alt-universe", icon: Compass },
                            { name: "Opposition Map", route: "/ai-analyst/opposition-map", icon: Shield },
                          ].map(item => (
                            <button
                              key={item.route}
                              onClick={() => {
                                setIsOpen(false);
                                setLocation(item.route);
                              }}
                              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-white/20 text-left transition-all cursor-pointer flex items-center justify-between group"
                            >
                              <span className="text-[11px] font-bold text-white group-hover:text-purple-300">
                                {item.name}
                              </span>
                              <ChevronRight className="w-3 h-3 text-white/30 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: NATURAL LANGUAGE CLIP NAVIGATOR ─── */}
                {activeTab === "ask" && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-white/70">
                      Ask Gully to find any official landmark replay or player milestone clip on JioHotstar:
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleFindClip();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={askQuery}
                        onChange={(e) => setAskQuery(e.target.value)}
                        placeholder="e.g. 'Kohli 75 in final' or 'Patidar 93 against GT'..."
                        className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white placeholder-white/30"
                      />
                      <button
                        type="submit"
                        disabled={isSearching || !askQuery.trim()}
                        className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {isSearching ? "..." : "Find"}
                      </button>
                    </form>

                    {/* Quick suggestion pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono text-white/40">Try:</span>
                      {[
                        "Kohli 75* in Final",
                        "Patidar 93* in Q1",
                        "Gill 104 in Q2",
                        "Sooryavanshi 97",
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAskQuery(item);
                            handleFindClip(item);
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 text-[9px] font-mono border border-white/5 cursor-pointer"
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    {/* Matching Result */}
                    {clipResult && (
                      <div className="pt-2">
                        {clipResult.matched && clipResult.url ? (
                          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                            <div className="flex items-center justify-between text-[8px] font-mono text-emerald-400 font-bold uppercase">
                              <span>VERIFIED MATCH</span>
                              <span>{clipResult.clip_id}</span>
                            </div>
                            <div className="font-black text-white text-xs">
                              {clipResult.title}
                            </div>
                            <button
                              type="button"
                              onClick={() => searchAndOpenClip(askQuery)}
                              className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Play className="w-3 h-3 fill-black" />
                              <span>Watch on JioHotstar</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-white/50 text-center">
                            No exact clip match found. Try typing a player name or stage.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Drawer Bar */}
              <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>Beyond XI AI Mascot</span>
                <button
                  onClick={handleSkipTour}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Close Guide
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═════════════════════════════════════════════════════════════════
            3. FLOATING AVATAR TRIGGER ICON (ALWAYS ACCESSIBLE IN BOTTOM-RIGHT)
           ═════════════════════════════════════════════════════════════════ */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-2xl transition-all cursor-pointer relative group border ${
            isOpen
              ? "bg-[#070B18] border-cyan-400 ring-2 ring-cyan-400/30"
              : "bg-[#0B1020]/95 hover:bg-[#101830] border-white/20 hover:border-cyan-400"
          }`}
          style={{
            boxShadow: theme?.glow
              ? `0 0 20px ${theme.glow}, 0 4px 15px rgba(0,0,0,0.6)`
              : "0 0 20px rgba(6,182,212,0.3), 0 4px 15px rgba(0,0,0,0.6)"
          }}
          title={isOpen ? "Close Gully AI Guide" : "Open Gully AI Guide"}
        >
          {/* Animated Mascot Face */}
          <div className="relative flex items-center justify-center">
            <span className="text-2xl select-none group-hover:scale-110 transition-transform">
              🤖
            </span>
            {/* Holographic Signal Beacon */}
            <div
              className="w-2.5 h-2.5 rounded-full absolute -top-1 -right-1 border border-black animate-pulse"
              style={{ backgroundColor: theme?.accent || "#06B6D4" }}
            />
          </div>

          {/* Mini Guide Label Tag */}
          <div className="absolute -bottom-2 px-1.5 py-0.2 rounded-full bg-black/90 border border-white/20 text-[7px] font-mono font-bold tracking-widest uppercase text-cyan-300">
            GULLY
          </div>
        </motion.button>
      </div>
    </div>
  );
}
