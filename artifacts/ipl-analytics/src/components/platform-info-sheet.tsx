import React, { useState } from "react";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  HelpCircle,
  Database,
  ShieldCheck,
  Scale,
  Cpu,
  BookOpen,
  Lock,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";

interface PlatformInfoSheetProps {
  children?: React.ReactNode;
}

export function PlatformInfoSheet({ children }: PlatformInfoSheetProps) {
  const [activeTab, setActiveTab] = useState<"about" | "methodology" | "data" | "disclaimer" | "privacy">("about");

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <button
            title="Platform Information & Methodology"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer border border-white/5 hover:border-white/20"
          >
            <Info className="w-4 h-4 text-cyan-400" />
          </button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-[90vw] sm:w-[480px] bg-[#070B18]/95 backdrop-blur-2xl border-l border-white/10 text-white p-6 overflow-y-auto custom-scrollbar">
        <SheetHeader className="border-b border-white/10 pb-4 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              PLATFORM KNOWLEDGE BASE
            </span>
            <span className="text-[10px] text-white/30">•</span>
            <span className="text-[10px] font-mono text-white/50">v2.4 TELEMETRY</span>
          </div>
          <SheetTitle className="text-xl font-black uppercase text-white tracking-tight">
            IPL Intelligence OS × Beyond XI
          </SheetTitle>
          <SheetDescription className="text-xs text-white/60">
            Official methodology documentation, data lineage, broadcasting rights notice, and privacy guidelines.
          </SheetDescription>
        </SheetHeader>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 py-4 border-b border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: "about", label: "About", icon: Cpu },
            { id: "methodology", label: "Methodology", icon: Scale },
            { id: "data", label: "Data Sources", icon: Database },
            { id: "disclaimer", label: "Legal & Broadcaster", icon: ShieldCheck },
            { id: "privacy", label: "Privacy", icon: Lock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-5 space-y-4 text-xs leading-relaxed text-white/80">
          {activeTab === "about" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wide mb-1">
                  The Three Interconnected Layers
                </h4>
                <p className="text-white/60">
                  Beyond XI is not just a fantasy prediction site or cric-score board. It combines three layers into one connected ecosystem:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="font-bold text-cyan-400 uppercase text-[11px] tracking-wider mb-0.5">
                    1. IPL Intelligence OS
                  </div>
                  <p className="text-[11px] text-white/70">
                    The analytical foundation: 280,000+ ball-by-ball delivery records, dimensional slicers, venue profiles, and phase-split player leaderboards across 18 IPL seasons (2008–2026).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="font-bold text-amber-400 uppercase text-[11px] tracking-wider mb-0.5">
                    2. Beyond XI Fan Ecosystem
                  </div>
                  <p className="text-[11px] text-white/70">
                    Fan identity and community: franchise-personalized Dugouts, Fan Parliament voting with data evidence drawers, Auction War Room purse simulations, and Cardverse digital decks.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="font-bold text-purple-400 uppercase text-[11px] tracking-wider mb-0.5">
                    3. AI Analyst Engine
                  </div>
                  <p className="text-[11px] text-white/70">
                    Tactical decision engines: Strategy Simulator, Monte Carlo Alternate Universe time machine, Opponent Exploit maps, and Dew & Ball Wear impact modeling.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/about" className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-[11px]">
                  <span>Read Full About Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === "methodology" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wide mb-1">
                  Metric Calculations & Principles
                </h4>
                <p className="text-white/60">
                  Every statistic on Beyond XI adheres to rigorous quantitative benchmarks:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="font-bold text-white text-[11px]">Phase Over Splits</div>
                  <p className="text-[10px] text-white/60">
                    Powerplay: Overs 1.1–6.0 • Middle: Overs 6.1–15.0 • Death Overs: Overs 15.1–20.0.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="font-bold text-white text-[11px]">Pressure Genome Index</div>
                  <p className="text-[10px] text-white/60">
                    Calculated from Required Run Rate (RRR) acceleration, wickets-in-hand leverage, and match stage (League vs Knockout final).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="font-bold text-white text-[11px]">Monte Carlo Simulation Model</div>
                  <p className="text-[10px] text-white/60">
                    Runs 1,000 independent ball-by-ball simulated iterations using batsman matchup distributions and venue par variance.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/methodology" className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-[11px]">
                  <span>Explore Methodology Standards</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wide mb-1">
                  Verified Data Lineage
                </h4>
                <p className="text-white/60">
                  Data integrity is verified from canonical public sources:
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#031536] border border-cyan-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="font-black text-white text-xs">Cricsheet Ball-by-Ball Warehouse</span>
                </div>
                <p className="text-[11px] text-white/70">
                  All 1,243 IPL matches from 2008 to 2026 are parsed from Cricsheet open ball-by-ball records, indexed in an optimized SQLite database with legal and extra ball tracking.
                </p>
              </div>

              <p className="text-[11px] text-white/50">
                Data exclusions: Sub-millimeter tracking coordinates (Hawkeye) and physical pitch moisture sensors are proprietary broadcaster assets and are never fabricated.
              </p>

              <div className="pt-2">
                <Link href="/data-sources" className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-[11px]">
                  <span>Inspect Data Attribution</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === "disclaimer" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wide mb-1">
                  Third-Party Independence Notice
                </h4>
                <p className="text-white/60">
                  Beyond XI is an independent analytical platform built for cricket researchers, analysts, and fans worldwide.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs">Non-Affiliation Disclaimer</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Beyond XI is not affiliated with, sponsored by, or endorsed by the Board of Control for Cricket in India (BCCI), the Indian Premier League (IPL), JioHotstar, Star Sports, or any IPL franchise.
                </p>
              </div>

              <p className="text-[11px] text-white/60">
                All team names, crests, logos, and player identifiers are used strictly under fair-use commentary, editorial analysis, and educational research provisions. Video highlights open exclusively on official broadcaster portals.
              </p>

              <div className="pt-2">
                <Link href="/disclaimer" className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-[11px]">
                  <span>Read Complete Legal Disclaimer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wide mb-1">
                  Privacy & Cookie Policy
                </h4>
                <p className="text-white/60">
                  Beyond XI respects user privacy and complies with modern data transparency standards:
                </p>
              </div>

              <div className="space-y-2 text-[11px] text-white/70">
                <p>• <strong>Guest Local Storage:</strong> Team preferences and local mock auction drafts are stored entirely in your device's browser localStorage and never transmitted to third parties.</p>
                <p>• <strong>Analytics & Consent:</strong> Telemetry cookies are only activated when approved via our Consent Banner.</p>
                <p>• <strong>No PII Sale:</strong> We do not collect or sell personally identifiable information.</p>
              </div>

              <div className="pt-2">
                <Link href="/privacy" className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-[11px]">
                  <span>Review Privacy Policy</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer in Sheet */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
          <span>IPL Intelligence OS</span>
          <span>© 2026 Beyond XI</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
