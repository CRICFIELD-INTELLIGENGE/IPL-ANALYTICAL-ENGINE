import type { CSSProperties } from "react";
export function CricketScene({
  ballKey = 0,
  hit = false,
  outcome = "waiting",
  label = "Final over under lights",
}: {
  ballKey?: number;
  hit?: boolean;
  outcome?: "waiting" | "boundary" | "runs" | "dot" | "wicket";
  label?: string;
}) {
  return (
    <svg
      className="cricket-scene"
      viewBox="0 0 900 440"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id="cs-sky" x2="0" y2="1">
          <stop stopColor="#101f50" />
          <stop offset="1" stopColor="#546b9c" />
        </linearGradient>
        <linearGradient id="cs-grass" x2="0" y2="1">
          <stop stopColor="#3b945e" />
          <stop offset="1" stopColor="#185b40" />
        </linearGradient>
        <radialGradient id="cs-light">
          <stop stopColor="#fff5d2" stopOpacity=".8" />
          <stop offset="1" stopColor="#fff5d2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="900" height="440" fill="url(#cs-sky)" />
      <path d="M0 110Q450 280 900 110V285H0Z" fill="#1c2b47" />
      <path
        d="M0 130Q450 300 900 130M0 155Q450 325 900 155M0 180Q450 350 900 180"
        fill="none"
        stroke="#8091b2"
        strokeWidth="14"
      />
      {Array.from({ length: 45 }, (_, i) => (
        <g key={i} fill={["#c2d4ff", "#f4bd70", "#fff5db", "#8973b0"][i % 4]}>
          <circle
            cx={i * 21}
            cy={150 + Math.sin((i / 44) * Math.PI) * 85}
            r="3"
          />
          <circle
            cx={i * 21 + 10}
            cy={180 + Math.sin((i / 44) * Math.PI) * 85}
            r="3"
          />
        </g>
      ))}
      <ellipse cx="450" cy="395" rx="640" ry="170" fill="url(#cs-grass)" />
      <ellipse
        cx="450"
        cy="370"
        rx="380"
        ry="105"
        fill="none"
        stroke="#dde9a5"
        strokeWidth="3"
      />
      <path d="M420 265H480L540 440H360Z" fill="#d3b887" />
      <path d="M400 305H500M375 405H525" stroke="#fff8df" strokeWidth="3" />
      {[70, 830].map((x) => (
        <g key={x}>
          <path d={`M${x} 70V250`} stroke="#8797aa" strokeWidth="7" />
          <rect x={x - 35} y="55" width="70" height="25" fill="#fff4c9" />
          <circle cx={x} cy="65" r="120" fill="url(#cs-light)" />
        </g>
      ))}
      <g transform="translate(450 277) scale(.65)">
        <circle cy="-65" r="17" fill="#b7815b" />
        <path d="M-20 -45H20L28 0H-20Z" fill="#e44d43" />
        <path d="M-13 0L-18 35M13 0L20 35" stroke="#d9e5e8" strokeWidth="14" />
        <path
          d="M-16 -37L-35 -68M15 -37L40 -85"
          stroke="#b7815b"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </g>
      <g
        className={hit ? "cs-batter cs-hit" : "cs-batter"}
        key={ballKey}
        style={{ transformOrigin: "510px 392px" } as CSSProperties}
      >
        <ellipse cx="517" cy="413" rx="40" ry="10" fill="#0004" />
        <path
          d="M503 355L492 405M527 355L544 405"
          stroke="#d8e7e5"
          strokeWidth="17"
        />
        <path
          d="M497 310L532 310L536 355L500 355Z"
          fill="var(--team-accent,#2695ef)"
        />
        <circle cx="516" cy="291" r="19" fill="#bd8a62" />
        <path d="M496 291Q496 266 518 270Q537 272 537 292Z" fill="#16334a" />
        <path
          d="M500 318L482 340L526 350M531 319L547 337L526 350"
          fill="none"
          stroke="#bd8a62"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          className="cs-bat"
          d="M525 350L556 402"
          stroke="#f0d297"
          strokeWidth="15"
          strokeLinecap="round"
        />
      </g>
      <g stroke="#fff3d2" strokeWidth="5">
        {[455, 466, 477].map((x) => (
          <path key={x} d={`M${x} 400V360`} />
        ))}
      </g>
      {outcome !== "waiting" && (
        <circle
          key={`ball-${ballKey}`}
          className={outcome === "boundary" ? "cs-ball cs-shot" : "cs-ball"}
          cx="450"
          cy="278"
          r="5"
          fill="#ed5843"
        />
      )}
      {outcome === "wicket" && (
        <text
          x="450"
          y="195"
          textAnchor="middle"
          fontFamily="system-ui"
          fontSize="45"
          fontWeight="900"
          fill="#ffe495"
        >
          WICKET!
        </text>
      )}
      <rect x="20" y="20" rx="10" width="260" height="40" fill="#071526cc" />
      <text
        x="35"
        y="46"
        fontFamily="system-ui"
        fontWeight="700"
        fontSize="16"
        fill="#f5eccb"
      >
        {label}
      </text>
    </svg>
  );
}
