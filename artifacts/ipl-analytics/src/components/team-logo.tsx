import React, { useState } from "react";
import { teamColor, teamShort } from "@/lib/aggregates";

export function TeamLogo({ team, size = "w-14 h-14" }: { team: string; size?: string }) {
  const [error, setError] = useState(false);
  const t = team?.toUpperCase() || "";
  
  const isCSK = t.includes("CSK") || t.includes("CHENNAI");
  const isMI = t.includes("MI") || t.includes("MUMBAI");
  const isSRH = t.includes("SRH") || t.includes("HYDERABAD");
  const isDC = t.includes("DC") || t.includes("DELHI");
  const isLSG = t.includes("LSG") || t.includes("LUCKNOW");
  const isKKR = t.includes("KKR") || t.includes("KOLKATA");
  const isGT = t.includes("GT") || t.includes("GUJARAT TITANS") || (t.includes("GUJARAT") && !t.includes("LIONS"));
  const isRCB = t.includes("RCB") || t.includes("BENGALURU") || t.includes("BANGALORE");
  const isPBKS = t.includes("PBKS") || t.includes("PUNJAB");
  const isDeccan = t.includes("DECCAN") || t.includes("CHARGERS");
  const isGLions = t.includes("GUJARAT LIONS") || (t.includes("LIONS") && t.includes("GUJARAT"));
  // Both Pune sides share the word, so the more specific one is decided first
  // and Warriors takes whatever is left.
  const isRPS = t.includes("RISING PUNE") || t.includes("SUPERGIANT") || t === "RPS";
  const isPW = t.includes("PUNE WARRIORS") || t === "PW" || (t.includes("PUNE") && !isRPS);
  const isKTK = t.includes("KOCHI") || t.includes("TUSKER") || t === "KTK";
  // Matched on the full name or an exact code, never on a bare "RR" substring:
  // "PUNE WARRIORS" contains one.
  const isRR = t.includes("RAJASTHAN") || t === "RR";

  let src = null;
  if (isCSK) src = "/csk logo.png";
  else if (isMI) src = "/mi logo.jpg";
  else if (isSRH) src = "/srh logo.jpg";
  else if (isDC) src = "/dc logo.jpg";
  else if (isLSG) src = "/lsg logo.jpg";
  else if (isKKR) src = "/kkr logo.png";
  else if (isGT) src = "/gt logo.png";
  else if (isRCB) src = "/rcb logo.png";
  else if (isPBKS) src = "/pbks logo.png";
  else if (isDeccan) src = "/deccan chargers logo.jpg";
  else if (isGLions) src = "/gujarat lions logo.jpg";
  else if (isRPS) src = "/rps logo.jpg";
  else if (isPW) src = "/pune warriors logo.jpg";
  else if (isKTK) src = "/kochi tuskers kerala logo.png";
  else if (isRR) src = "/rr logo.png";

  // Every IPL franchise now has an asset, so this is only reached if a file
  // fails to load or an unrecognised name is passed. It uses the real
  // abbreviation and club colour rather than the first three letters of the
  // name, which produced "RAJ", "RIS" and "KOC".
  if (error || !src) {
    const accent = teamColor(team);
    return (
      <div
        className={`${size} rounded-full flex items-center justify-center font-black text-[10px] shrink-0 uppercase tracking-tighter border`}
        style={{
          background: `linear-gradient(135deg, ${accent}55, ${accent}18)`,
          borderColor: `${accent}66`,
          color: "#fff",
        }}
        title={team}
      >
        {teamShort(team)}
      </div>
    );
  }

  const isJpg = src.endsWith(".jpg");

  return (
    <div className="relative group/logo">
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity" />
      <img
        src={src}
        className={`${size} object-contain shrink-0 relative z-10 rounded-full ${isJpg ? 'bg-white p-0.5 border border-white/20' : ''}`}
        style={{
          filter: isGT ? 'invert(1) hue-rotate(180deg) brightness(1.2) contrast(1.2)' : 'none',
          mixBlendMode: isGT ? 'screen' : 'normal',
          opacity: 0.95
        }}
        alt={team}
        onError={() => setError(true)}
      />
    </div>
  );
}

