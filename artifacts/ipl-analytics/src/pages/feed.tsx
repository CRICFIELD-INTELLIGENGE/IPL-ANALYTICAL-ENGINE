import React, { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Play, ArrowRight, Sparkles, X, Trophy
} from "lucide-react";
import { AdVessel } from "@/components/ad-vessel";

export type CardId = "squad" | "auction" | "tactics" | "stars" | "venues" | "storylines";

interface CardDef {
  id: CardId;
  title: string;
  subtitle: string;
  img: string;
  badge: string;
  color: string;
  modNum: string;
  href: string;
}

const CARDS: CardDef[] = [
  {
    id: "squad",
    title: "SQUAD BUILDING",
    subtitle: "Retentions, releases, core",
    img: "/squad-building.jpg",
    badge: "LIVE INTEL",
    color: "text-blue-400",
    modNum: "01",
    href: "/dugout",
  },
  {
    id: "auction",
    title: "AUCTION",
    subtitle: "Purse, players, market",
    img: "/auction-gavel.jpg",
    badge: "₹120 CR CAP",
    color: "text-amber-400",
    modNum: "02",
    href: "/auction",
  },
  {
    id: "tactics",
    title: "TACTICS",
    subtitle: "Evolving game styles",
    img: "/tactics-board.jpg",
    badge: "TEAM RADAR",
    color: "text-cyan-400",
    modNum: "03",
    href: "/intelligence",
  },
  {
    id: "stars",
    title: "STAR WATCH",
    subtitle: "Rising names to watch",
    img: "/star-watch.jpg",
    badge: "TOP TALENTS",
    color: "text-purple-400",
    modNum: "04",
    href: "/stats",
  },
  {
    id: "venues",
    title: "VENUES",
    subtitle: "Conditions & trends",
    img: "/venues-stadium.jpg",
    badge: "PITCH MAPS",
    color: "text-emerald-400",
    modNum: "05",
    href: "/visualizations",
  },
  {
    id: "storylines",
    title: "STORYLINES",
    subtitle: "Rivalries, narratives",
    img: "/storylines.jpg",
    badge: "COUNTDOWN",
    color: "text-pink-400",
    modNum: "06",
    href: "/pulse",
  },
];

export default function FeedPage() {
  const [showRecapModal, setShowRecapModal] = useState(false);

  // Match Pulse scroll transforms
  const { scrollYProgress } = useScroll();
  const masterScale = useTransform(scrollYProgress, [0.4, 0.7], [1, 0.96]);
  const heroH = useTransform(scrollYProgress, [0, 0.15, 0.25], ["100%", "44%", "44%"]);
  const heroW = useTransform(scrollYProgress, [0, 0.08, 0.2], ["100%", "100%", "calc(100% - 450px)"]);
  const col2W = useTransform(scrollYProgress, [0.08, 0.2], ["0px", "430px"]);
  const titleSz = useTransform(scrollYProgress, [0, 0.15, 0.25], ["72px", "28px", "28px"]);
  const padTop = useTransform(scrollYProgress, [0, 0.15, 0.25], ["10%", "4%", "4%"]);
  const padLeft = useTransform(scrollYProgress, [0, 0.15, 0.25], ["6%", "4%", "4%"]);
  const titleOp = useTransform(scrollYProgress, [0, 0.6, 0.8], [1, 1, 0]);
  const r1Op = useTransform(scrollYProgress, [0.05, 0.16], [0, 1]);
  const r1X = useTransform(scrollYProgress, [0.05, 0.16], [30, 0]);

  return (
    <Layout hideHeaderProgress={scrollYProgress}>
      {/* ═════════════════════════════════════════════════════════════════════
          HERO SECTION (SHRINKS ON DRAG DOWN & REVEALS RCB CARD)
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="min-h-screen">
        <motion.div
          style={{ scale: masterScale }}
          className="sticky top-0 w-full min-h-[calc(100vh-20px)] flex flex-col justify-between gap-4 overflow-hidden bg-[#050816] p-4 origin-top"
        >
          {/* ROW 1: HERO BANNER + IPL 2026 RCB CHAMPIONS CARD */}
          <motion.div className="flex gap-3 shrink-0" style={{ height: heroH }}>
            {/* HERO TITLE CARD */}
            <motion.div
              style={{ width: heroW }}
              className="relative bg-[#0B1020] rounded-[24px] border border-white/10 overflow-hidden shrink-0 group shadow-2xl"
            >
              <div className="absolute inset-0">
                <img
                  src="/ipl-trophy-cup.jpg"
                  alt="TATA IPL Championship Trophy"
                  className="absolute inset-0 w-full h-full object-cover object-right opacity-80 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/85 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-black/30" />
                <div className="absolute inset-0 opacity-[0.04] bg-grid-40" />
              </div>

              <motion.div style={{ paddingTop: padTop, paddingLeft: padLeft, opacity: titleOp }} className="relative z-10 h-full flex flex-col justify-between pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      INTELLIGENCE FEED
                    </span>
                    <span className="text-[10px] font-mono text-white/40 tracking-wider">IPL 2027 In Focus</span>
                  </div>

                  <div className="text-[11px] font-black tracking-[0.25em] text-white/50 uppercase mb-0.5">
                    THE NEXT SEASON
                  </div>
                  <motion.h1 style={{ fontSize: titleSz, lineHeight: '0.88' }} className="font-black text-white uppercase tracking-tighter scale-x-105 origin-left">
                    IPL <span className="text-primary">2027</span>
                  </motion.h1>
                  <p className="text-white/60 text-xs mt-1.5 max-w-md hidden sm:block">
                    New Teams. New Strategies. Same Obsession.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <Link
                    href="/dugout"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <span>Explore 2027 Intel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setShowRecapModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Watch Recap</span>
                  </button>
                </div>
              </motion.div>

              <div className="absolute right-6 bottom-6 z-10 hidden xl:flex flex-col items-end text-right pointer-events-none">
                <span className="text-xs font-black uppercase tracking-wider text-white">BIGGER FASTER SMARTER</span>
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">2027 BEGINS SOON</span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-4 h-1 rounded-full bg-primary" />
                  <span className="w-1.5 h-1 rounded-full bg-white/20" />
                  <span className="w-1.5 h-1 rounded-full bg-white/20" />
                </div>
              </div>
            </motion.div>

            {/* RIGHT SIDE CARD: IPL 2026 RCB CHAMPIONS CARD */}
            <motion.div
              style={{ width: col2W, opacity: r1Op, x: r1X }}
              className="bg-[#0B1020] rounded-[24px] border border-amber-500/20 flex flex-col overflow-hidden shadow-2xl min-w-0 relative group cursor-pointer"
              onClick={() => setShowRecapModal(true)}
            >
              <div className="absolute inset-0 pointer-events-none">
                <img
                  src="/rcb winner 2026.jpg"
                  alt="Royal Challengers Bengaluru IPL 2026 Champions"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060913] via-[#060913]/60 to-black/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 via-transparent to-amber-950/30" />
              </div>

              <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#0B1020]/80 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    IPL 2026 Champions
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/40 text-red-300 text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  Defending Champions
                </span>
              </div>

              <div className="relative z-10 flex-1 p-3 flex flex-col justify-end">
                <div className="p-3 rounded-2xl bg-[#070B14]/90 backdrop-blur-md border border-amber-500/30 shadow-2xl space-y-2 group-hover:border-amber-500/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 p-1 flex items-center justify-center shrink-0 shadow-inner">
                        <img src="/rcb logo.png" alt="RCB" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="text-[12px] font-black text-white uppercase tracking-tight flex items-center gap-1.5 leading-none">
                          Royal Challengers
                          <span className="text-amber-400">Bengaluru</span>
                        </div>
                        <span className="text-[9px] font-mono text-amber-400/90 uppercase tracking-wider mt-1 block">
                          ★ TATA IPL 2026 Title Holders
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                        #1 RANK
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <span className="text-[8px] font-bold uppercase text-white/40 block">Trophy</span>
                      <span className="text-[10px] font-black text-amber-300">Maiden Title</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <span className="text-[8px] font-bold uppercase text-white/40 block">Campaign</span>
                      <span className="text-[10px] font-black text-white">11W - 4L</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <span className="text-[8px] font-bold uppercase text-white/40 block">2027 Status</span>
                      <span className="text-[10px] font-black text-red-400">Defending</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 text-[9px] text-white/60">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Click to view celebration moment
                    </span>
                    <ArrowRight className="w-3 h-3 text-white/40 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ROW 2: 6 EXPLORATION SHORTCUT TILES (CLICK TO NAVIGATE) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 pb-2">
            {CARDS.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group border border-white/10 hover:border-white/30 hover:scale-[1.02] flex flex-col justify-end p-3.5 min-h-[110px] shadow-lg"
              >
                <div className="absolute inset-0">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/80 to-transparent" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-white tracking-tight leading-tight group-hover:text-primary transition-colors">
                      {card.title}
                    </span>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/10 border border-white/20 group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <span className="text-[9px] text-white/60 block mt-1 truncate">
                    {card.subtitle}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Clean In-Feed Partner Telemetry Ad Vessel */}
          <div className="shrink-0 pt-1 pb-1">
            <AdVessel slot="1029384759" format="horizontal" label="2027 Intelligence Partner · Mega Auction Briefing" minHeight={84} />
          </div>
        </motion.div>
      </div>

      {/* 2026 RECAP & RCB CHAMPIONS LIGHTBOX MODAL */}
      <AnimatePresence>
        {showRecapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowRecapModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0B1020] border border-amber-500/30 rounded-[28px] max-w-xl w-full overflow-hidden shadow-2xl relative"
            >
              <div className="relative h-48 sm:h-56 w-full overflow-hidden">
                <img
                  src="/rcb winner 2026.jpg"
                  alt="RCB 2026 Champions Celebration"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-[#0B1020]/40 to-black/40" />
                <button
                  onClick={() => setShowRecapModal(false)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition-colors backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-black uppercase tracking-widest inline-block mb-1">
                      DEFENDING CHAMPIONS
                    </span>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      Royal Challengers Bengaluru
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/40 p-1 shrink-0 hidden sm:flex items-center justify-center">
                    <img src="/rcb logo.png" alt="RCB" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3.5 text-xs text-white/80 leading-relaxed">
                <p>
                  The 2026 Indian Premier League concluded with <strong className="text-amber-300 font-bold">Royal Challengers Bengaluru (RCB)</strong> capturing their maiden championship title in a historic Grand Final, setting up their title defense for the upcoming IPL 2027 season.
                </p>

                <div className="grid grid-cols-3 gap-2.5 p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                  <div>
                    <span className="text-[8px] font-black uppercase text-amber-400 block">Trophy</span>
                    <span className="text-xs font-bold text-white">2026 Champions</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase text-red-400 block">Campaign Run</span>
                    <span className="text-xs font-bold text-white">11W - 4L</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase text-emerald-400 block">Orange Cap</span>
                    <span className="text-xs font-bold text-white">V. Kohli (741)</span>
                  </div>
                </div>

                <p className="text-white/60 text-[11px]">
                  RCB enters the 2027 cycle with the tournament's highest baseline team rating (86/100) and priority death-over reinforcements.
                </p>

                <button
                  onClick={() => setShowRecapModal(false)}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Close & Return to 2027 Command Center
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
