import React, { useState } from 'react';
import CricFieldLogo from './CricFieldLogo';
import CricFieldDoodleAnimation from './CricFieldDoodleAnimation';
import { FRANCHISE_THEMES, FranchiseTheme } from '@/lib/franchiseColors';
import { useTeamTheme } from '@/lib/team-context';

export default function CricfieldHeroBanner({ showSwitcher = false }: { showSwitcher?: boolean }) {
  const [showDoodle, setShowDoodle] = useState(false);
  const { selectedTeam } = useTeamTheme();
  const [localOverride, setLocalOverride] = useState<string | null>(null);
  const activeKey = localOverride ?? (selectedTeam ? selectedTeam.toLowerCase() : 'default');
  const theme: FranchiseTheme = FRANCHISE_THEMES[activeKey] || FRANCHISE_THEMES.default;

  return (
    <div
      className="relative w-full min-h-[380px] sm:min-h-[440px] bg-[#070e17] overflow-hidden flex flex-col items-center justify-center p-6 sm:p-10 border-y border-white/10 transition-colors duration-500 rounded-3xl"
      style={{
        ['--accent-primary' as any]: theme.primary,
        ['--accent-secondary' as any]: theme.secondary,
        ['--accent-glow' as any]: theme.glow,
      }}
    >
      {/* 1. STADIUM FLOODLIGHTS & AMBIENT GLOW */}
      <div className="absolute top-8 left-12 w-28 h-28 bg-white/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-8 right-12 w-36 h-36 bg-white/25 rounded-full blur-3xl pointer-events-none" />
      
      {/* Dynamic central neon stadium flare */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 40%, var(--accent-primary) 0%, transparent 65%)`,
        }}
      />

      {/* 2. BASELINE TURF SHADOW */}
      <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none overflow-hidden opacity-30">
        <div
          className="absolute -bottom-10 inset-x-0 h-28 transform -skew-y-2 transition-colors duration-500"
          style={{ background: `linear-gradient(to top, var(--accent-primary), transparent)` }}
        />
      </div>

      {/* 3. LOGO WORDMARK OR INTERACTIVE DOODLE PHYSICS ANIMATION */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center py-2">
        {showDoodle ? (
          <div className="w-full max-w-4xl">
            <CricFieldDoodleAnimation accentColor={theme.primary} />
          </div>
        ) : (
          <CricFieldLogo variant="wordmark" accentColor={theme.primary} className="w-full max-w-4xl drop-shadow-2xl" />
        )}

        <button
          onClick={() => setShowDoodle(!showDoodle)}
          className="mt-3 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-mono font-bold tracking-wider uppercase text-white/80 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-lg backdrop-blur-md"
        >
          <span>{showDoodle ? "⏹ Show Classic Wordmark" : "🏏 Play Doodle Physics Animation"}</span>
        </button>
      </div>

      {/* 4. OPTIONAL FRANCHISE PALETTE SWITCHER */}
      {showSwitcher && (
        <div className="relative z-20 mt-6 flex flex-wrap items-center justify-center gap-2 bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800 backdrop-blur-md">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-2">
            Franchise Theme:
          </span>
          {Object.entries(FRANCHISE_THEMES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'default') {
                  setLocalOverride('default');
                } else {
                  setLocalOverride(key);
                }
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeKey === key
                  ? 'bg-neutral-800 text-white border border-neutral-600 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/40"
                style={{ backgroundColor: t.primary }}
              />
              {t.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
