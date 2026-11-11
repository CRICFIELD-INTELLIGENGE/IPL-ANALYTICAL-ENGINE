'use client';

import React, { useState } from 'react';
import { MascotBallArtwork, useMascotExpression } from './MascotBallArtwork';
import { type MascotEmoji, type MascotActivity } from '@/lib/mascot-reactions';
import { FRANCHISE_THEMES } from '@/lib/franchiseColors';
import { useTeamTheme, resolveTeamCode, TeamCode } from '@/lib/team-context';

export type MascotMood =
  | 'competitive'
  | 'confident'
  | 'happy'
  | 'wink'
  | 'cool'
  | 'fire'
  | 'shocked'
  | 'sad'
  | 'analytical'
  | 'laughing';

export interface CricFieldMascotProps {
  /**
   * IPL franchise code: 'CSK' | 'MI' | 'RCB' | 'KKR' | 'SRH' | 'RR' | 'DC' | 'PBKS' | 'GT' | 'LSG' | 'default'
   * If omitted, automatically synchronizes with active team context!
   */
  team?: TeamCode | 'default' | string;
  /**
   * Expressive facial state
   */
  mood?: MascotMood;
  emoji?: MascotEmoji;
  activity?: MascotActivity;
  /**
   * Size in pixels (width & height) or CSS size string
   */
  size?: number | string;
  /**
   * Custom CSS classes
   */
  className?: string;
  /**
   * If true, winks playfully on hover
   */
  interactive?: boolean;
  /**
   * Explicit override for ball accent color
   */
  accentColor?: string;
  /**
   * Accessibility label
   */
  ariaLabel?: string;
}

/** Reusable version of the ball nestled on C in the CricField logo. */
export function CricFieldMascot({ team, mood = 'happy', emoji, activity, size = 48, className = '', interactive = false, accentColor, ariaLabel }: CricFieldMascotProps) {
 const { selectedTeam } = useTeamTheme();
 const [hovered, setHovered] = useState(false);
 const code = resolveTeamCode(team) ?? selectedTeam;
 const theme = FRANCHISE_THEMES[team === 'default' ? 'default' : code?.toLowerCase() ?? 'default'] ?? FRANCHISE_THEMES.default;
 const moods: Record<MascotMood, MascotEmoji> = {competitive:'😤',confident:'😏',happy:'😀',wink:'😉',cool:'😎',fire:'🤩',shocked:'😲',sad:'😢',analytical:'🧐',laughing:'😂'};
 const face = useMascotExpression(activity ?? (mood === 'happy' ? 'idle' : undefined), emoji ?? (activity || mood === 'happy' ? undefined : moods[mood]));
 const dimension = typeof size === 'number' ? `${size}px` : size;
 return <div className={`inline-flex items-center justify-center shrink-0 select-none ${className}`} style={{width:dimension,height:dimension}} onMouseEnter={()=>interactive&&setHovered(true)} onMouseLeave={()=>setHovered(false)} role="img" aria-label={ariaLabel ?? `CricField mascot: ${activity ?? mood}`}>
  <svg viewBox="0 0 100 100" fill="none" className="w-full h-full overflow-visible" aria-hidden="true">
   <MascotBallArtwork emoji={hovered && interactive ? '😉' : face} accentColor={accentColor ?? theme.primary}/>
  </svg>
 </div>;
}
export default CricFieldMascot;
