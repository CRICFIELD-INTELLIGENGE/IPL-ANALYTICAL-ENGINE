'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { FRANCHISE_THEMES, FranchiseTheme } from '@/lib/franchiseColors';
import { useTeamTheme, TeamCode } from '@/lib/team-context';
import { CricFieldMascot, MascotMood } from './CricFieldMascot';

export interface CricFieldDoodleAnimationProps {
  team?: TeamCode | 'default' | string;
  accentColor?: string;
  className?: string;
  autoPlayOnMount?: boolean;
  onAnimationComplete?: () => void;
  showPlayButton?: boolean;
}

/**
 * Google Doodle-style interactive cricket physics animation for CRICFIELD.
 * Choreography:
 * 1. The Bounce Phase: Mascot ball drops and bounces across C -> R -> I -> C -> F with squash & stretch.
 * 2. The Wicket Strike & Collapse: Ball smashes into stump 'I', bails 'E' fly, remaining letters collapse.
 * 3. The Pitch Reset: Letters spring up from the turf crease, wicket pops back, ball re-nests into 'C'.
 */
export default function CricFieldDoodleAnimation({
  team,
  accentColor,
  className = '',
  autoPlayOnMount = false,
  onAnimationComplete,
  showPlayButton = true,
}: CricFieldDoodleAnimationProps) {
  const { selectedTeam, theme: contextTheme } = useTeamTheme();
  const activeTeamKey = (team || selectedTeam || 'default').toLowerCase();
  const franchiseTheme: FranchiseTheme =
    FRANCHISE_THEMES[activeTeamKey] ||
    (contextTheme
      ? {
          name: contextTheme.name,
          primary: contextTheme.accent,
          secondary: contextTheme.secondary,
          glow: contextTheme.glow,
          baseText: '#ffffff',
        }
      : FRANCHISE_THEMES.default);

  const effectiveAccent = accentColor || franchiseTheme.primary;

  const containerRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const lettersRef = useRef<(SVGElement | null)[]>([]);
  const stumpRef = useRef<SVGGElement>(null);
  const bailsRef = useRef<SVGGElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const [mascotMood, setMascotMood] = React.useState<MascotMood>('happy');

  const runAnimation = () => {
    const ball = ballRef.current;
    const letters = lettersRef.current.filter(Boolean);
    const stump = stumpRef.current;
    const bails = bailsRef.current;

    if (!ball || !stump || !bails) return;

    // Kill any active tweens
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    gsap.killTweensOf([ball, stump, bails, ...letters]);

    // Initial reset
    setMascotMood('wink');
    gsap.set(ball, { x: 30, y: -90, scaleX: 1, scaleY: 1, opacity: 1, rotation: 0 });
    gsap.set(letters, { y: 0, rotation: 0, opacity: 1 });
    gsap.set(stump, { y: 0, rotation: 0, opacity: 1 });
    gsap.set(bails, { y: 0, x: 0, rotation: 0, opacity: 1 });

    const tl = gsap.timeline({
      onComplete: () => {
        setMascotMood('happy');
        onAnimationComplete?.();
      },
    });
    timelineRef.current = tl;

    // ═════════════════════════════════════════════════════════════════
    // PHASE 1: THE BOUNCE PHASE (C -> R -> I -> C -> F)
    // ═════════════════════════════════════════════════════════════════
    // 1. Drop onto C
    tl.to(ball, { y: 14, duration: 0.42, ease: 'power2.in' })
      .to(ball, { scaleX: 1.25, scaleY: 0.75, duration: 0.08, yoyo: true, repeat: 1 })
      .to(letters[0], { y: 4, duration: 0.08, yoyo: true, repeat: 1 }, '-=0.12')

      // Arc to R
      .to(ball, { x: 74, y: -26, duration: 0.28, ease: 'power1.out' })
      .to(ball, { y: 18, duration: 0.22, ease: 'power2.in' })
      .to(ball, { scaleX: 1.2, scaleY: 0.8, duration: 0.07, yoyo: true, repeat: 1 })
      .to(letters[1], { y: 4, duration: 0.07, yoyo: true, repeat: 1 }, '-=0.1')

      // Arc to I1
      .to(ball, { x: 134, y: -22, duration: 0.26, ease: 'power1.out' })
      .to(ball, { y: 18, duration: 0.2, ease: 'power2.in' })
      .to(ball, { scaleX: 1.2, scaleY: 0.8, duration: 0.07, yoyo: true, repeat: 1 })
      .to(letters[2], { y: 4, duration: 0.07, yoyo: true, repeat: 1 }, '-=0.1')

      // Arc to C2
      .to(ball, { x: 168, y: -20, duration: 0.28, ease: 'power1.out' })
      .to(ball, { y: 18, duration: 0.22, ease: 'power2.in' })
      .to(ball, { scaleX: 1.22, scaleY: 0.78, duration: 0.07, yoyo: true, repeat: 1 })
      .to(letters[3], { y: 4, duration: 0.07, yoyo: true, repeat: 1 }, '-=0.1')

      // Arc to F
      .to(ball, { x: 230, y: -16, duration: 0.24, ease: 'power1.out' })
      .to(ball, { y: 20, duration: 0.2, ease: 'power2.in' })
      .to(ball, { scaleX: 1.22, scaleY: 0.78, duration: 0.07, yoyo: true, repeat: 1 })
      .to(letters[4], { y: 4, duration: 0.07, yoyo: true, repeat: 1 }, '-=0.1');

    // ═════════════════════════════════════════════════════════════════
    // PHASE 2: WICKET STRIKE & COLLAPSE (WICKET HIT!)
    // ═════════════════════════════════════════════════════════════════
    tl.call(() => setMascotMood('fire'))
      .to(ball, {
        x: 295,
        y: 45,
        duration: 0.22,
        ease: 'power3.in',
      })
      .add('shatter', '-=0.04');

    // Reaction mood: Shocked on impact
    tl.call(() => setMascotMood('shocked'), [], 'shatter');

    // Ball ricochets away with spin
    tl.to(
      ball,
      {
        x: 430,
        y: 135,
        rotation: 480,
        duration: 0.65,
        ease: 'power2.out',
      },
      'shatter'
    );

    // Bails dislodge and go flying into the air
    tl.to(
      bails,
      {
        x: 55,
        y: -45,
        rotation: 140,
        opacity: 0,
        duration: 0.6,
        ease: 'power1.out',
      },
      'shatter'
    );

    // Stump topples backward with bounce
    tl.to(
      stump,
      {
        rotation: 82,
        y: 38,
        opacity: 0.45,
        duration: 0.42,
        ease: 'bounce.out',
      },
      'shatter'
    );

    // Letters collapse down into pitch with stagger
    tl.to(
      letters,
      {
        y: 65,
        rotation: (i) => (i % 2 === 0 ? 14 : -16),
        opacity: 0,
        stagger: 0.04,
        duration: 0.45,
        ease: 'power2.in',
      },
      'shatter+=0.08'
    );

    // ═════════════════════════════════════════════════════════════════
    // PHASE 3: PITCH RESET & CREASE RESTORATION
    // ═════════════════════════════════════════════════════════════════
    tl.to({}, { duration: 0.65 }); // Dramatic pause

    // Reset mood to laughing victory
    tl.call(() => setMascotMood('laughing'));

    // Letters spring back up from the pitch crease
    tl.to(letters, {
      y: 0,
      rotation: 0,
      opacity: 1,
      stagger: 0.04,
      duration: 0.5,
      ease: 'back.out(1.8)',
    });

    // Stumps and bails emerge from the crease
    tl.fromTo(
      stump,
      { y: 80, rotation: 0, opacity: 0 },
      { y: 0, rotation: -9, opacity: 1, duration: 0.45, ease: 'back.out(2)' },
      '-=0.28'
    );

    tl.fromTo(
      bails,
      { y: -35, x: 0, rotation: 0, opacity: 0 },
      { y: 0, x: 0, rotation: 0, opacity: 1, duration: 0.4, ease: 'bounce.out' },
      '-=0.18'
    );

    // Mascot ball re-tucks smoothly into C
    tl.to(
      ball,
      {
        x: 44,
        y: 20,
        rotation: 0,
        opacity: 1,
        duration: 0.55,
        ease: 'elastic.out(1, 0.45)',
      },
      '-=0.2'
    );
  };

  useEffect(() => {
    if (autoPlayOnMount) {
      const timer = setTimeout(() => {
        runAnimation();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoPlayOnMount]);

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 bg-slate-950/85 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Pitch Crease Light Aura */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 60%, ${effectiveAccent} 0%, transparent 70%)`,
        }}
      />

      {/* Interactive Animation Stage */}
      <div
        ref={containerRef}
        className="cursor-pointer group relative z-10 w-full flex justify-center"
        onClick={runAnimation}
        title="Click to play Doodle Cricket Wicket Strike!"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            runAnimation();
          }
        }}
      >
        <svg
          viewBox="0 0 680 150"
          className="w-full max-w-2xl h-auto overflow-visible select-none transition-transform duration-300 group-hover:scale-[1.01]"
        >
          {/* Baseline Crease / Pitch Track */}
          <line
            x1="20"
            y1="96"
            x2="580"
            y2="96"
            stroke={effectiveAccent}
            strokeWidth="2.5"
            opacity="0.4"
          />

          <g
            style={{
              fontFamily: 'var(--font-sports, "Teko", "Impact", sans-serif)',
              fontStyle: 'italic',
              fontWeight: 900,
            }}
          >
            {/* Letter C */}
            <text
              ref={(el) => {
                lettersRef.current[0] = el;
              }}
              x="15"
              y="96"
              fontSize="88"
              fill="#ffffff"
            >
              C
            </text>

            {/* Mascot Ball (3D cricket ball with mood reactions) */}
            <g ref={ballRef} transform="translate(44, 20)">
              {/* Outer Ball Body */}
              <circle cx="0" cy="0" r="14" fill={effectiveAccent} stroke="#ffffff" strokeWidth="1.8" />
              {/* Seam */}
              <path d="M -10 -6 C -3 -3, 3 3, 10 8" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="2.5 2" />

              {/* Dynamic Facial Features mapped to mascotMood */}
              {mascotMood === 'fire' ? (
                <>
                  <path d="M -7 -6 L -2 -3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M 7 -6 L 2 -3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                  <ellipse cx="-4" cy="-2" rx="2.5" ry="3" fill="#ffffff" />
                  <ellipse cx="4" cy="-2" rx="2.5" ry="3" fill="#ffffff" />
                  <circle cx="-3.5" cy="-2" r="1.5" fill="#dc2626" />
                  <circle cx="3.5" cy="-2" r="1.5" fill="#dc2626" />
                  <rect x="-4" y="3" width="8" height="3" fill="#ffffff" stroke="#000" strokeWidth="0.8" rx="0.5" />
                </>
              ) : mascotMood === 'shocked' ? (
                <>
                  <ellipse cx="-4" cy="-3" rx="3.5" ry="4.5" fill="#ffffff" />
                  <ellipse cx="4" cy="-3" rx="3.5" ry="4.5" fill="#ffffff" />
                  <circle cx="-4" cy="-3" r="1.2" fill="#000000" />
                  <circle cx="4" cy="-3" r="1.2" fill="#000000" />
                  <ellipse cx="0" cy="5" rx="3" ry="4" fill="#070e17" stroke="#ffffff" strokeWidth="1" />
                </>
              ) : mascotMood === 'laughing' ? (
                <>
                  <path d="M -7 -3 Q -4 -6 -1 -3" stroke="#000" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M 1 -3 Q 4 -6 7 -3" stroke="#000" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M -5 3 Q 0 9 5 3 Z" fill="#070e17" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M -3 3 Q 0 5 3 3" fill="#ffffff" />
                  <circle cx="0" cy="6" r="1.5" fill="#f43f5e" />
                </>
              ) : mascotMood === 'wink' ? (
                <>
                  <ellipse cx="-4" cy="-3" rx="2.8" ry="4.5" fill="#ffffff" />
                  <circle cx="-3.2" cy="-2.2" r="1.6" fill="#000000" />
                  <circle cx="-2.6" cy="-3" r="0.6" fill="#ffffff" />
                  <path d="M 1 -3 Q 4 1 7 -3" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  <path d="M -5 3 Q 0 8 5 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  {/* Happy */}
                  <ellipse cx="-4" cy="-3" rx="2.8" ry="4.5" fill="#ffffff" />
                  <ellipse cx="4" cy="-3" rx="2.8" ry="4.5" fill="#ffffff" />
                  <circle cx="-3.2" cy="-2.2" r="1.6" fill="#000000" />
                  <circle cx="3.2" cy="-2.2" r="1.6" fill="#000000" />
                  <circle cx="-2.6" cy="-3" r="0.6" fill="#ffffff" />
                  <circle cx="3.8" cy="-3" r="0.6" fill="#ffffff" />
                  <path d="M -5 3 Q 0 9 5 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M -2 5.5 Q 0 7.5 2 5.5" fill="#f43f5e" />
                </>
              )}
            </g>

            {/* Letters R, I, C, F */}
            <text ref={(el) => { lettersRef.current[1] = el; }} x="74" y="96" fontSize="88" fill="#ffffff">
              R
            </text>
            <text ref={(el) => { lettersRef.current[2] = el; }} x="134" y="96" fontSize="88" fill="#ffffff">
              I
            </text>
            <text ref={(el) => { lettersRef.current[3] = el; }} x="168" y="96" fontSize="88" fill="#ffffff">
              C
            </text>
            <text ref={(el) => { lettersRef.current[4] = el; }} x="228" y="96" fontSize="88" fill="#ffffff">
              F
            </text>

            {/* Letter I (Stump) - Aligned height & tilt */}
            <g ref={stumpRef} transform="translate(286, 36) rotate(-9 8 56)">
              <rect x="0" y="4" width="10" height="56" rx="3" fill="#ffffff" />
              <rect x="2.5" y="8" width="5" height="48" rx="1.5" fill={effectiveAccent} />
              <circle cx="5" cy="3" r="4.5" fill="#ffffff" />
            </g>

            {/* Letter E (Bails) - Full cap height alignment */}
            <g ref={bailsRef} transform="translate(312, 24)">
              <rect x="0" y="0" width="9" height="72" rx="2.5" fill="#ffffff" />
              <rect x="7" y="0" width="34" height="15" rx="4.5" fill={effectiveAccent} stroke="#ffffff" strokeWidth="1.4" />
              <rect x="7" y="28.5" width="26" height="15" rx="4.5" fill={effectiveAccent} stroke="#ffffff" strokeWidth="1.4" />
              <rect x="7" y="57" width="36" height="15" rx="4.5" fill={effectiveAccent} stroke="#ffffff" strokeWidth="1.4" />
            </g>

            {/* Letter L (Bat with grounded foot) */}
            <g ref={(el) => { lettersRef.current[5] = el; }} transform="translate(372, 24)">
              <rect x="6" y="0" width="6" height="20" rx="1.5" fill="#ffffff" />
              <path d="M 2 20 L 16 20 L 14 56 L 3 56 Z" fill="#ffffff" />
              <rect x="5" y="24" width="8" height="22" fill={effectiveAccent} rx="1" />
              <path d="M 2 56 L 38 56 Q 40 56 40 64 L 40 72 L 2 72 Z" fill="#ffffff" />
            </g>

            {/* Letter D */}
            <text ref={(el) => { lettersRef.current[6] = el; }} x="430" y="96" fontSize="88" fill="#ffffff">
              D
            </text>
          </g>
        </svg>
      </div>

      {showPlayButton && (
        <button
          type="button"
          onClick={runAnimation}
          className="mt-4 px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 hover:bg-white/20 active:scale-95 text-neutral-200 transition flex items-center gap-2 cursor-pointer shadow-lg"
          aria-label="Play Doodle Cricket Animation"
        >
          <span>Play Doodle Animation</span>
          <span>🏏</span>
        </button>
      )}
    </div>
  );
}
