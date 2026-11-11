'use client';

import React from 'react';
import { Link } from 'wouter';
import { MascotBallArtwork, useMascotExpression } from './MascotBallArtwork';
import { type MascotEmoji, type MascotActivity } from '@/lib/mascot-reactions';

export interface CricFieldLogoProps {
  /**
   * Display mode:
   * - "header": Crisp vector logo for sticky navbar (desktop ~180-200px, mobile ~135-155px)
   * - "banner": Hero banner with full stadium illumination, flare, grass splatter & silhouettes
   * - "footer": Main branding showcase panel in footer (desktop ~320-380px, mobile ~230-270px)
   * - "compact": Sleek horizontal mark for bottom copyright bar (desktop ~170-195px, mobile ~145-165px)
   * - "wordmark": Standalone vector wordmark
   */
  variant?: 'header' | 'banner' | 'footer' | 'compact' | 'wordmark';
  emoji?: MascotEmoji;
  activity?: MascotActivity;
  accentColor?: string;
  className?: string;
  asLink?: boolean;
}

/**
 * Pure SVG recreation of the original CRICFIELD sports brand identity.
 * Features:
 * 1. Large, heavy condensed italic typography in crisp white.
 * 2. Mascot cricket ball nestled into the top curve of 'C' with smooth top (no spikes or loops).
 * 3. Dynamic speed trails sweeping down around the outer spine of 'C'.
 * 4. Cricket stump #1 forming 'I' tilting smoothly left and right between 'F' and 'E'.
 * 5. Letter 'E' (cricket stump backbone + 3 horizontal bails) with EXACT same height (180px, Y=188 to Y=368) as other letters.
 * 6. Cricket bat 'L' with EXACT same height (180px, Y=188 to Y=368) as other letters, with textured handle and grounded foot.
 * 7. Tagline 'BEYOND THE BOUNDARY.' starting under 'R' (x=214) and ending under 'L' (x=816).
 */
export function CricFieldWordmarkSVG({
  accentColor,
  emoji,
  activity,
  className = 'w-full h-auto overflow-visible',
}: {
  emoji?: MascotEmoji;
  activity?: MascotActivity;
  accentColor?: string;
  className?: string;
}) {
  const uniqueId = React.useId().replace(/:/g, '');
  const glowId = `cfGlow-${uniqueId}`;
  const shadowId = `cfShadow-${uniqueId}`;
  const taglineGlowId = `cfTaglineGlow-${uniqueId}`;
  const mascotExpression = useMascotExpression(activity, emoji);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const hits = [150, 270, 350, 440, 540, 600, 680, 780, 885];
  const impactStyles = hits.map((x, i) => {
    const hit = 18 + i * 5;
    return `@keyframes cfFall${i} {
      0%, ${hit}% { transform: translateY(0) rotate(0deg) scaleY(1); }
      ${hit + 3}% { transform: translateY(4px) rotate(${i % 2 ? -78 : 78}deg) scaleY(.85); }
      ${hit + 5}%, 73% { transform: translateY(10px) rotate(${i % 2 ? -87 : 87}deg) scaleY(.75); opacity: 1; }
      79% { transform: translateY(24px) rotate(0deg) scaleY(.02); opacity: 0; }
      84% { transform: translateY(0) rotate(0deg) scaleY(1.06); opacity: 1; }
      88%, 100% { transform: none; opacity: 1; }
    }
    .cf-letter-${i} { transform-origin: ${x}px 368px; animation: cfFall${i} 18s ease-in-out infinite; }`;
  }).join('');
  const deliveryFrames = hits.map((x, i) => {
    const hit = 18 + i * 5;
    return `${hit - 2}% { transform: translate(${x - 230}px, -40px); opacity: 1; }
      ${hit}% { transform: translate(${x - 205}px, 14px); opacity: 1; }
      ${hit + 2}% { transform: translate(${x - 185}px, -40px); opacity: 1; }`;
  }).join('');
  const effectiveAccent = accentColor || 'var(--accent-primary, #a3e635)';

  return (
    <svg
      ref={svgRef}
      viewBox="42 70 916 370"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CricField - Beyond The Boundary"
    >
      <defs>
        {/* Neon franchise glow filter */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={effectiveAccent} floodOpacity="0.6" />
        </filter>
        <filter id={taglineGlowId} x="-20%" y="-70%" width="140%" height="240%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="var(--accent-secondary, #15803d)" floodOpacity="0.9" />
        </filter>
        {/* Subtle sports 3D athletic drop shadow */}
        <filter id={shadowId} x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="2" dy="5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
        </filter>

        {/* Dynamic smooth swinging keyframes for the stump 'I' tilting left and right */}
        <style>{`
          ${impactStyles}
          @keyframes cfDelivery {
            0%, 10%, 96%, 100% { transform: translate(0, 0); }
            13% { transform: translate(-55px, -40px); }
            ${deliveryFrames}
            /* Spring off D, bounce below the baseline, then follow C's sweep home. */
            62% { transform: translate(715px, 75px); }
            64% { transform: translate(710px, 210px); }
            66% { transform: translate(650px, 140px); }
            69% { transform: translate(565px, 230px); }
            71% { transform: translate(470px, 190px); }
            74% { transform: translate(340px, 230px); }
            77% { transform: translate(180px, 225px); }
            80% { transform: translate(15px, 220px); }
            82% { transform: translate(-90px, 199px); }
            84% { transform: translate(-126px, 180px); }
            86% { transform: translate(-145px, 145px); }
            88% { transform: translate(-145px, 110px); }
            90% { transform: translate(-127px, 69px); }
            92% { transform: translate(-95px, 38px); }
            94% { transform: translate(-55px, 23px); }
          }
          @keyframes cfReturnTrail {
            0%, 80% { stroke-dashoffset: 0; }
            81%, 82% { stroke-dashoffset: 1; }
            95%, 100% { stroke-dashoffset: 0; }
          }
          .cf-return-trails path {
            stroke-dasharray: 1;
            animation: cfReturnTrail 18s linear infinite;
          }
          .cf-delivery { animation: cfDelivery 18s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .cf-letter, .cf-delivery, .cf-return-trails path { animation: none !important; }
            .cf-delivery { transform: none; }
          }
          @keyframes cfStumpTiltAnim {
            0% { transform: rotate(-8.5deg); }
            8% { transform: rotate(8.5deg); }
            16% { transform: rotate(-8.5deg); }
            24% { transform: rotate(8.5deg); }
            32% { transform: rotate(-8.5deg); }
            40% { transform: rotate(8.5deg); }
            43%, 83% { transform: rotate(0deg); }
            88% { transform: rotate(-8.5deg); }
            94% { transform: rotate(8.5deg); }
            100% { transform: rotate(-8.5deg); }
          }
          .cf-stump-static {
            transform-origin: 11px 165px;
            animation: cfStumpTiltAnim 18s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .cf-stump-static {
              animation: none;
              transform: rotate(0deg);
            }
          }
          @keyframes cfMascotBlink {
            0%, 41%, 45%, 74%, 78%, 100% { transform: scaleY(1); }
            43%, 76% { transform: scaleY(0.08); }
          }
          @keyframes cfMascotExpression {
            0%, 24.99% { opacity: 1; }
            25%, 100% { opacity: 0; }
          }
          .cf-mascot-eyes {
            transform-box: fill-box;
            transform-origin: center;
            animation: cfMascotBlink 5.3s ease-in-out infinite;
          }
          .cf-mascot-expression { opacity: 0; animation: cfMascotExpression 16s steps(1, end) infinite; }
          .cf-mascot-happy { animation-delay: 0s; }
          .cf-mascot-surprised { animation-delay: -12s; }
          .cf-mascot-laughing { animation-delay: -8s; }
          .cf-mascot-cheeky { animation-delay: -4s; }
          @media (prefers-reduced-motion: reduce) {
            .cf-mascot-eyes, .cf-mascot-expression { animation: none; }
            .cf-mascot-expression { opacity: 0; }
            .cf-mascot-happy { opacity: 1; }
          }
        `}</style>
      </defs>

      {/* ================= 1. SPEED TRAILS SWEEPING AROUND 'C' ================= */}
      {/* Smooth motion sweeps emerging from bottom-left of the mascot ball, wrapping down around C */}
      <g id="speed-trails" className="cf-return-trails">
        <path pathLength="1"
          d="M 115 365 C 68 350, 50 310, 62 265 C 75 220, 130 185, 175 190"
          stroke={effectiveAccent}
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
          filter={`url(#${glowId})`}
        />
        <path pathLength="1"
          d="M 160 175 C 115 170, 60 205, 48 255 C 36 305, 52 355, 95 372"
          stroke={effectiveAccent}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <path pathLength="1"
          d="M 188 205 C 150 205, 95 240, 85 285 C 75 325, 90 355, 125 362"
          stroke={effectiveAccent}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
      </g>

      {/* ================= 2. THE MASCOT CRICKET BALL ================= */}
      {/* Sits right inside top curl of 'C'. Smooth on top and right, NO spiky antennas or outer loops */}
      <g id="mascot-ball" className="cf-delivery">
        <g transform="translate(155, 116)" filter={`url(#${shadowId})`}>
          <MascotBallArtwork emoji={mascotExpression} accentColor={effectiveAccent} />
        </g>
      </g>

      {/* ================= 3. TYPOGRAPHY 'CRICFIELD' ================= */}
      {/* All letters share the exact same top cap height (y=188) and baseline (y=368), Height = 180px */}
      <g
        style={{
          fontFamily: 'var(--font-sports, "Teko", "Impact", "Arial Black", sans-serif)',
          fontStyle: 'italic',
          fontWeight: 900,
        }}
        filter={`url(#${shadowId})`}
      >
        {/* 'C' (First Letter) - Top Y=188, Bottom Y=368 */}
        <g className="cf-letter cf-letter-0">        <text x="85" y="368" fontSize="220" fill="#ffffff">
          C
        </text></g>

        {/* 'R' - Starts at x=210, Top Y=188, Bottom Y=368 */}
        <g className="cf-letter cf-letter-1">        <text x="210" y="368" fontSize="220" fill="#ffffff">
          R
        </text></g>

        {/* 'I' - Top Y=188, Bottom Y=368 */}
        <g className="cf-letter cf-letter-2">        <text x="330" y="368" fontSize="220" fill="#ffffff">
          I
        </text></g>

        {/* 'C' (Second Letter) - Top Y=188, Bottom Y=368 */}
        <g className="cf-letter cf-letter-3">        <text x="385" y="368" fontSize="220" fill="#ffffff">
          C
        </text></g>

        {/* 'F' - Top Y=188, Bottom Y=368 */}
        <g className="cf-letter cf-letter-4">        <text data-cap-f="" x="495" y="368" fontSize="220" fill="#ffffff">
          F
        </text></g>

        {/* ================= 4. CRICKET STUMP 'I' (TILTING LEFT AND RIGHT) ================= */}
        {/* Located at x=590, grounded on baseline (y=368). Top sits below F's overhang with smooth left/right tilt */}
<g className="cf-letter cf-letter-5">        <g id="stump-I-group" transform="translate(588, 203)">
          <g className="cf-stump-static">
            {/* White outer cylinder */}
            <rect x="0" y="10" width="22" height="155" rx="7" fill="#ffffff" />
            {/* Accent interior core */}
            <rect x="5" y="24" width="12" height="130" rx="4" fill={effectiveAccent} />
            {/* Rounded top cap */}
            <circle cx="11" cy="9" r="10" fill="#ffffff" />
            {/* Stenciled Stump numeral '1' */}
            <text
              x="11"
              y="98"
              fontSize="18"
              fontStyle="normal"
              fontWeight="900"
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              1
            </text>
          </g>
        </g></g>

        {/* ================= 5. CRICKET STUMP + 3 BAILS 'E' ================= */}
        {/* Original 194px height; foot stays at y=368. */}
<g className="cf-letter cf-letter-6">        <g id="letter-E-stump-bails" transform="translate(628, 174)">
          {/* Vertical Backbone Stump spanning full 194px */}
          <g transform="rotate(7 11 180)">
            <rect x="0" y="8" width="22" height="182" rx="7" fill="#ffffff" />
            <rect x="5" y="24" width="12" height="154" rx="4" fill={effectiveAccent} />
            <circle cx="11" cy="9" r="10" fill="#ffffff" />
            <text
              x="11"
              y="105"
              fontSize="18"
              fontStyle="normal"
              fontWeight="900"
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              2
            </text>
          </g>

          {/* 3 Horizontal Bails Extending Rightward */}
          {/* Top Bail: Aligned flush with Cap Line at Y=174 (y=0) */}
          <rect
            x="18"
            y="0"
            width="84"
            height="28"
            rx="8"
            fill={effectiveAccent}
            stroke="#ffffff"
            strokeWidth="3.5"
            filter={`url(#${glowId})`}
          />
          <rect x="36" y="8" width="40" height="12" rx="4" fill="#ffffff" opacity="0.45" />

          {/* Middle Bail */}
          <rect
            x="18"
            y="83"
            width="66"
            height="28"
            rx="8"
            fill={effectiveAccent}
            stroke="#ffffff"
            strokeWidth="3.5"
            filter={`url(#${glowId})`}
          />
          <rect x="32" y="91" width="30" height="12" rx="4" fill="#ffffff" opacity="0.45" />

          {/* Bottom Bail: Aligned flush with Baseline at Y=368 (y=166, ends at 194) */}
          <rect
            x="18"
            y="166"
            width="88"
            height="28"
            rx="8"
            fill={effectiveAccent}
            stroke="#ffffff"
            strokeWidth="3.5"
            filter={`url(#${glowId})`}
          />
          <rect x="38" y="174" width="42" height="12" rx="4" fill="#ffffff" opacity="0.45" />
        </g></g>

        {/* ================= 6. CRICKET BAT 'L' ================= */}
        {/* Original 194px height; foot stays at y=368. */}
<g className="cf-letter cf-letter-7">        <g id="letter-L-bat" transform="translate(734, 174)">
          {/* Bat Handle at Top: Aligned flush with Cap Line at Y=174 (y=0 to 54) */}
          <rect x="22" y="0" width="16" height="54" rx="4" fill="#ffffff" />
          {/* Textured grip wraps */}
          <line x1="22" y1="14" x2="38" y2="14" stroke={effectiveAccent} strokeWidth="3" />
          <line x1="22" y1="28" x2="38" y2="28" stroke={effectiveAccent} strokeWidth="3" />
          <line x1="22" y1="42" x2="38" y2="42" stroke={effectiveAccent} strokeWidth="3" />

          {/* Slanted Blade Body (y: 54 to 170) */}
          <path
            d="M 12 54 L 48 54 L 44 170 L 8 170 Z"
            fill="#ffffff"
          />
          {/* Accent Brand Sticker in Center of Blade */}
          <rect x="18" y="70" width="20" height="82" rx="3" fill={effectiveAccent} />
          <path d="M 23 82 L 33 110 L 23 138" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7" />

          {/* Grounded Horizontal Foot flush with Baseline at Y=368 (y: 170 to 194) */}
          <path
            d="M 6 170 L 90 170 Q 94 170 94 182 L 94 194 L 6 194 Z"
            fill="#ffffff"
          />
        </g></g>

        {/* ================= 7. LETTER 'D' - Top Y=188, Bottom Y=368 ================= */}
        <g className="cf-letter cf-letter-8">        <text x="834" y="368" fontSize="220" fill="#ffffff">
          D
        </text></g>
      </g>

      <path d="M90 373 Q490 379 930 373 M115 374 l-4 -10 m13 10 l5 -8 M650 376 l-3 -10 m12 10 l5 -9 M850 375 l-3 -9" stroke={effectiveAccent} strokeWidth="3" strokeLinecap="round" opacity=".65" />

      {/* ================= 8. TAGLINE 'BEYOND THE BOUNDARY.' ================= */}
      {/* Starts precisely under 'R' at x=214 and ends under 'L' foot at x=816 */}
      {/* Uses exact per-glyph X coordinates for zero distortion and identical cross-browser rendering */}
      <text
        x="214.0 245.7 277.4 309.1 340.7 372.4 404.1 435.8 467.5 499.2 530.8 562.5 594.2 625.9 657.6 689.3 720.9 752.6 784.3 816.0"
        y="424"
        fontSize="28"
        fontStyle="italic"
        fontWeight="900"
        fill="#ffffff"
        filter={`url(#${taglineGlowId})`}
        style={{
          fontFamily: 'var(--font-sports, "Teko", "Impact", "Arial Black", sans-serif)',
        }}
      >
        BEYOND THE BOUNDARY.
      </text>
    </svg>
  );
}

/**
 * CricField Stadium Background Layer (Used in banner variant)
 */
function CricFieldStadiumBannerLayer({
  accentColor,
  children,
}: {
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative w-full min-h-[360px] sm:min-h-[440px] bg-[#070e17] overflow-hidden flex flex-col items-center justify-center p-6 sm:p-10 border-y border-white/10 rounded-3xl"
      style={{
        ['--accent-primary' as any]: accentColor,
      }}
    >
      {/* 1. Floodlight Towers & Atmospheric Beams */}
      <div className="absolute top-4 left-6 sm:left-12 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-4 right-6 sm:right-12 w-40 h-40 bg-white/25 rounded-full blur-3xl pointer-events-none" />
      
      {/* Diagonal Volumetric Light Cones */}
      <div
        className="absolute top-0 left-0 w-80 h-full opacity-20 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-0 right-0 w-80 h-full opacity-20 pointer-events-none"
        style={{
          background: 'linear-gradient(225deg, rgba(255,255,255,0.4) 0%, transparent 70%)',
        }}
      />

      {/* 2. Central Stadium Flare behind Wordmark */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${accentColor} 0%, transparent 65%)`,
        }}
      />

      {/* 3. Turf Grass Splatter & Baseline Shadow */}
      <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none overflow-hidden opacity-35">
        <div
          className="absolute -bottom-8 inset-x-0 h-24 transform -skew-y-1 transition-colors duration-500"
          style={{ background: `linear-gradient(to top, ${accentColor}, transparent)` }}
        />
        {/* Subtle grass blades silhouette */}
        <svg
          viewBox="0 0 1000 80"
          className="absolute bottom-0 inset-x-0 w-full h-12 text-[#070e17] fill-current"
          preserveAspectRatio="none"
        >
          <path d="M0 80 L0 50 Q 50 30 100 55 T 200 40 T 300 60 T 400 35 T 500 55 T 600 40 T 700 60 T 800 35 T 900 55 T 1000 45 L 1000 80 Z" />
        </svg>
      </div>

      {/* 4. Batsman & Fielder Silhouettes */}
      <div className="absolute bottom-6 left-6 sm:left-16 opacity-30 pointer-events-none hidden sm:block">
        <svg viewBox="0 0 100 120" className="w-16 h-20 fill-slate-400">
          {/* Fielder Silhouette */}
          <circle cx="50" cy="25" r="10" />
          <path d="M 45 38 L 55 38 L 68 70 L 58 75 L 52 50 L 46 50 L 32 80 L 22 75 Z" />
          <path d="M 40 45 L 20 60 L 25 65 L 42 52 Z" />
          <path d="M 58 45 L 80 50 L 78 58 L 56 52 Z" />
        </svg>
      </div>

      <div className="absolute bottom-6 right-6 sm:right-16 opacity-30 pointer-events-none hidden sm:block">
        <svg viewBox="0 0 100 120" className="w-16 h-20 fill-slate-400">
          {/* Batsman Silhouette */}
          <circle cx="45" cy="22" r="10" />
          <path d="M 40 34 L 52 34 L 56 68 L 75 105 L 65 108 L 48 75 L 40 105 L 30 102 Z" />
          {/* Bat raised */}
          <path d="M 52 40 L 75 25 L 82 28 L 58 48 Z" />
          <rect x="75" y="10" width="7" height="40" transform="rotate(30 75 10)" rx="2" />
        </svg>
      </div>

      {/* 5. Logo Wordmark */}
      <div className="relative z-10 w-full flex justify-center py-4">{children}</div>
    </div>
  );
}

/**
 * CricField Unified Brand Logo Component.
 * Supports:
 * - header: ~180-200px desktop, ~135-155px mobile (sticky top navbar)
 * - banner: Hero banner with full stadium illumination and atmospheric effects
 * - footer: ~320-380px desktop, ~230-270px mobile (footer branding card)
 * - compact: ~170-195px desktop, ~145-165px mobile (footer bottom bar)
 * - wordmark: standalone clean mark
 */
export default function CricFieldLogo({
  variant = 'header',
  accentColor,
  emoji,
  activity,
  className = '',
  asLink = false,
}: CricFieldLogoProps) {
  const effectiveAccent = accentColor || 'var(--accent-primary, #a3e635)';

  let content: React.ReactNode;

  if (variant === 'header') {
    content = (
      <div className={`flex items-center shrink-0 ${className}`}>
        <CricFieldWordmarkSVG
          emoji={emoji} activity={activity}
          accentColor={effectiveAccent}
          className="w-[140px] sm:w-[185px] h-auto max-h-12 overflow-visible transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    );
  } else if (variant === 'compact') {
    content = (
      <div className={`flex items-center shrink-0 ${className}`}>
        <CricFieldWordmarkSVG
          emoji={emoji} activity={activity}
          accentColor={effectiveAccent}
          className="w-[145px] sm:w-[175px] h-auto overflow-visible"
        />
      </div>
    );
  } else if (variant === 'footer') {
    content = (
      <div className={`flex items-center justify-center ${className}`}>
        <CricFieldWordmarkSVG
          emoji={emoji} activity={activity}
          accentColor={effectiveAccent}
          className="w-[240px] sm:w-[350px] max-w-full h-auto overflow-visible"
        />
      </div>
    );
  } else if (variant === 'banner') {
    content = (
      <CricFieldStadiumBannerLayer accentColor={effectiveAccent}>
        <CricFieldWordmarkSVG
          emoji={emoji} activity={activity}
          accentColor={effectiveAccent}
          className={`w-full max-w-3xl sm:max-w-4xl h-auto drop-shadow-2xl overflow-visible ${className}`}
        />
      </CricFieldStadiumBannerLayer>
    );
  } else {
    // 'wordmark'
    content = (
      <div className={`flex items-center shrink-0 ${className}`}>
        <CricFieldWordmarkSVG
          emoji={emoji} activity={activity}
          accentColor={effectiveAccent}
          className={`w-full max-w-xl h-auto overflow-visible ${className}`}
        />
      </div>
    );
  }

  if (asLink) {
    return (
      <Link href="/home" className="inline-flex items-center group cursor-pointer" aria-label="CricField Home">
        {content}
      </Link>
    );
  }

  return <>{content}</>;
}
