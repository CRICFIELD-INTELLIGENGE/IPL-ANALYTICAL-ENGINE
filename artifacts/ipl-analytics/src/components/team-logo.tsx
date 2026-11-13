import React, { useState } from "react";
import { teamColor, teamShort } from "@/lib/aggregates";

export function TeamLogo({
  team,
  size = "w-14 h-14",
  className = "",
}: {
  team: string;
  size?: string;
  className?: string;
}) {
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
  const isRPS = t.includes("RISING PUNE") || t.includes("SUPERGIANT") || t === "RPS";
  const isPW = t.includes("PUNE WARRIORS") || t === "PW" || (t.includes("PUNE") && !isRPS);
  const isKTK = t.includes("KOCHI") || t.includes("TUSKER") || t === "KTK";
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

  if (error || !src) {
    const accent = teamColor(team);
    return (
      <div
        className={`${size} rounded-full flex items-center justify-center font-black text-[10px] shrink-0 uppercase tracking-tighter border shadow-sm ${className}`}
        style={{
          background: `linear-gradient(135deg, ${accent}55, ${accent}18)`,
          borderColor: `${accent}88`,
          color: "#fff",
        }}
        title={team}
      >
        {teamShort(team)}
      </div>
    );
  }

  const isJpg = src.endsWith(".jpg");
  const isCompact =
    size.includes("w-3") ||
    size.includes("w-3.5") ||
    size.includes("w-4") ||
    size.includes("w-5") ||
    size.includes("w-6") ||
    size.includes("w-7");

  // Padding tuned so every logo fills its circular badge comfortably without clipping
  const paddingClass = isCompact
    ? "p-[1.5px]"
    : isRR
    ? "p-1"
    : isJpg
    ? "p-0.5"
    : "p-1.5";

  // GT has white graphic elements, so its official dark navy #0B1B3D provides contrast
  // JPGs and other PNGs have rich white/light surfaces or dark colors
  const containerBg = isGT
    ? "bg-[#0B1B3D] border border-[#1E3A8A]/80 shadow-sm"
    : isJpg
    ? "bg-white border border-slate-200/80 dark:border-white/20 shadow-sm"
    : "bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/15 shadow-sm";

  return (
    <div
      className={`relative ${size} ${containerBg} rounded-full flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      title={team}
    >
      <img
        src={src}
        className={`w-full h-full object-contain shrink-0 ${paddingClass}`}
        style={{
          filter: "none",
          mixBlendMode: "normal",
        }}
        alt={team}
        onError={() => setError(true)}
      />
    </div>
  );
}
