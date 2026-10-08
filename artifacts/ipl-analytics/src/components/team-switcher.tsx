import React, { useState } from "react";
import { useLocation } from "wouter";
import { useTeamTheme, type TeamCode } from "@/lib/team-context";
import { Shield, ChevronDown, Check, X, Sparkles, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TeamSwitcher() {
  const { selectedTeam, setSelectedTeam, theme, allTeams, clearTeam } = useTeamTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleSelectTeam = (code: TeamCode) => {
    setSelectedTeam(code);
    setIsOpen(false);
  };

  const handleGoToDugout = (e: React.MouseEvent, code: TeamCode) => {
    e.stopPropagation();
    setSelectedTeam(code);
    setIsOpen(false);
    setLocation(`/dugout/${code}`);
  };

  return (
    <>
      {/* Switcher Header Pill */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-bold ${
            theme
              ? "bg-[#0B1020] border-white/20 hover:border-white/40 shadow-lg"
              : "bg-white/5 border-white/10 hover:border-white/20 text-white/70 hover:text-white"
          }`}
          style={{
            borderColor: theme ? `${theme.accent}55` : undefined,
            boxShadow: theme ? `0 0 12px ${theme.glow}` : undefined,
          }}
          title="Switch Franchise Identity"
        >
          {theme ? (
            <>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center p-0.5 overflow-hidden border"
                style={{ borderColor: `${theme.accent}66`, backgroundColor: `${theme.accent}22` }}
              >
                <img src={theme.logoImg} alt={theme.name} className="w-full h-full object-contain" />
              </div>
              <span className="font-black font-mono tracking-tight text-white hidden sm:inline">
                {theme.shortName}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono hidden md:inline text-white/80" style={{ backgroundColor: `${theme.accent}33` }}>
                DUGOUT
              </span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-[11px] hidden sm:inline">Choose Team</span>
            </>
          )}
          <ChevronDown className="w-3 h-3 text-white/40" />
        </button>
      </div>

      {/* Switcher Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0B1020] border border-white/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Top ambient lighting header */}
              <div
                className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
                style={{ backgroundColor: theme ? theme.accent : "#8B5CF6" }}
              />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      Franchise Dugout Switcher
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        BEYOND XI
                      </span>
                    </h3>
                    <p className="text-xs text-white/60">
                      Personalize your data feed, Dugout timeline, and tactical community identity.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Franchise Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-5 relative z-10">
                {allTeams.map((t) => {
                  const isSelected = selectedTeam === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTeam(t.id)}
                      className={`group relative p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[110px] ${
                        isSelected
                          ? "ring-2 scale-[1.03] shadow-lg"
                          : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]"
                      }`}
                      style={{
                        borderColor: isSelected ? t.accent : undefined,
                        backgroundColor: isSelected ? `${t.surfaceTint}` : undefined,
                        boxShadow: isSelected ? `0 0 16px ${t.glow}` : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div
                          className="w-9 h-9 rounded-xl p-1 flex items-center justify-center border shadow-inner"
                          style={{ borderColor: `${t.accent}44`, backgroundColor: `${t.accent}22` }}
                        >
                          <img src={t.logoImg} alt={t.name} className="w-full h-full object-contain" />
                        </div>
                        {isSelected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow"
                            style={{ backgroundColor: t.accent }}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        {!isSelected && t.titles > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1 rounded">
                            <Trophy className="w-2.5 h-2.5" />
                            {t.titles}
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-black uppercase text-white tracking-tight leading-tight">
                          {t.shortName}
                        </div>
                        <div className="text-[10px] text-white/50 truncate font-mono">
                          {t.city}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs relative z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      clearTeam();
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer font-mono text-[11px]"
                  >
                    Reset to Neutral View
                  </button>
                  <span className="text-white/40 text-[11px] hidden sm:inline">
                    • 80% Dark UI • 15% Atmospheric Glow • 5% Accent
                  </span>
                </div>

                {selectedTeam && (
                  <button
                    onClick={(e) => handleGoToDugout(e, selectedTeam)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                    style={{
                      backgroundColor: theme?.accent,
                      boxShadow: `0 0 15px ${theme?.glow}`,
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Enter {theme?.shortName} Dugout</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
