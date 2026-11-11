// Original SVG artwork for CRICFIELD Mobile (no stock imagery, no text baked in, no real people).

/** Floodlit stadium silhouette used behind the Home hero. */
export function StadiumLights({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="cfm-glow" cx="50%" cy="20%" r="60%"><stop offset="0" stopColor="#fff6cf" stopOpacity="0.55" /><stop offset="1" stopColor="#fff6cf" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="160" cy="40" r="90" fill="url(#cfm-glow)" />
      {[150, 186].map((x) => <g key={x}><rect x={x} y="40" width="4" height="130" fill="#8ea2b4" opacity=".6" /><g fill="#fff6cf">{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={x - 16 + (i % 3) * 13} y={22 + Math.floor(i / 3) * 10} width="9" height="6" rx="1" />)}</g></g>)}
      <path d="M0 170 Q120 120 240 170 V200 H0Z" fill="#174a3a" />
      <ellipse cx="120" cy="190" rx="110" ry="22" fill="none" stroke="#f5f0e7" strokeOpacity=".25" />
    </svg>
  );
}

/** Scorebook-style empty state mark. */
export function EmptyStumps() {
  return (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {[24, 38, 52].map((x) => <rect key={x} x={x} y="12" width="5" height="40" rx="1" fill="#91a5ae" opacity=".5" />)}
      <rect x="22" y="8" width="18" height="4" rx="1" fill="#e6bd68" transform="rotate(-12 31 10)" />
      <rect x="40" y="9" width="16" height="4" rx="1" fill="#e6bd68" opacity=".7" />
      <line x1="4" y1="54" x2="76" y2="54" stroke="#91a5ae" strokeOpacity=".4" />
    </svg>
  );
}
