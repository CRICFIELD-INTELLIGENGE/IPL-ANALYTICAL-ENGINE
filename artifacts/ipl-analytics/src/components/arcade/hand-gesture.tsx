export function HandGesture({
  value,
  hidden = false,
}: {
  value?: number;
  hidden?: boolean;
}) {
  const fingers =
    hidden || value == null ? 0 : value === 6 ? 0 : Math.min(4, value);
  return (
    <svg
      viewBox="0 0 150 170"
      className="cricket-hand"
      role="img"
      aria-label={
        hidden
          ? "Hand locked"
          : value == null
            ? "Waiting for a hand"
            : `${value} runs`
      }
    >
      <ellipse cx="78" cy="153" rx="43" ry="9" fill="#0002" />
      <g fill="#e7b787" stroke="#865633" strokeWidth="3" strokeLinejoin="round">
        <rect x="45" y="78" width="67" height="65" rx="24" />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={45 + i * 17}
            y={i < fingers ? 25 + Math.abs(1 - i) * 7 : 76}
            width="17"
            height={i < fingers ? 75 - Math.abs(1 - i) * 7 : 29}
            rx="8"
          />
        ))}
        {!hidden && (value === 5 || value === 6) ? (
          <path d="M48 107Q26 92 28 64Q30 49 39 58L52 90Z" />
        ) : (
          <path d="M50 101Q32 95 32 111Q35 127 55 126L78 116Q86 108 78 103Z" />
        )}
        <path d="M61 137V158H97V137" fill="#dca77a" />
      </g>
      <path d="M57 147H102V160H57Z" fill="var(--team-accent,#efbc60)" />
      {value != null && !hidden && (
        <text
          x="78"
          y="125"
          textAnchor="middle"
          fill="#684223"
          fontFamily="system-ui"
          fontWeight="700"
          fontSize="21"
        >
          {value}
        </text>
      )}
    </svg>
  );
}
