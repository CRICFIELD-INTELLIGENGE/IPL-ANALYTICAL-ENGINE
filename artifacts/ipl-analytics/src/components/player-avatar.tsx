import { useEffect, useMemo, useState } from "react";
import { getPlayerImageCandidates, usePlayerImages, usePlayerBios, usePlayerDisplayNames, displayPlayerName, playerSlug } from "@/lib/aggregates";

interface PlayerAvatarProps {
  name: string;
  playerImages?: Record<string, string>;
  bio?: { image?: string; fullName?: string; playerName?: string } | null;
  className?: string;
  imgClassName?: string;
}

/** "V Kohli" -> "VK", "Noor Ahmad" -> "NA", "Sachin" -> "S" */
function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable per-name hue so each player keeps the same placeholder colour. */
function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

/**
 * Self-healing player headshot.
 *
 * Sources are tried best-first (curated dict -> marquee crop -> real image
 * recorded in player-bio.json -> CDN name guess), advancing on each load
 * failure so a wrong guess never renders another player's face.
 */
export function PlayerAvatar({ name, playerImages: propImages, bio: propBio, className, imgClassName = "w-full h-full object-cover" }: PlayerAvatarProps) {
  const fetchedImages = usePlayerImages();
  const fetchedBios = usePlayerBios();
  const displayNames = usePlayerDisplayNames();

  const playerImages = propImages || fetchedImages.data;
  const displayName = useMemo(() => displayPlayerName(name, displayNames), [name, displayNames]);

  const bio = useMemo(() => {
    if (propBio) return propBio;
    if (!fetchedBios.data) return null;
    const bios = fetchedBios.data;
    const nSlug = playerSlug(name);
    const dSlug = playerSlug(displayName);
    if (bios[nSlug]) return bios[nSlug];
    if (bios[dSlug]) return bios[dSlug];
    if (bios[name]) return bios[name];
    if (bios[displayName]) return bios[displayName];

    const nClean = name.toLowerCase().trim();
    const dClean = displayName.toLowerCase().trim();
    for (const b of Object.values(bios)) {
      if (b.playerName?.toLowerCase().trim() === nClean || b.fullName?.toLowerCase().trim() === nClean) return b;
      if (b.playerName?.toLowerCase().trim() === dClean || b.fullName?.toLowerCase().trim() === dClean) return b;
    }
    return null;
  }, [propBio, fetchedBios.data, name, displayName]);

  const candidates = useMemo(() => {
    const setA = getPlayerImageCandidates(name, playerImages, bio);
    const setB = displayName && displayName !== name ? getPlayerImageCandidates(displayName, playerImages, bio) : [];
    return Array.from(new Set([...setA, ...setB])).filter(url => !url.includes("ui-avatars.com"));
  }, [name, displayName, playerImages, bio]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Restart the cascade when the player (or its candidate list) changes
  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [name, candidates]);

  const src = candidates[index];
  const exhausted = index >= candidates.length;

  const handleError = () => {
    setLoaded(false);
    setIndex(prev => prev + 1);
  };

  const labelName = displayName || name;

  const content = (
    <div className="relative w-full h-full overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center font-black select-none"
        style={{
          background: `linear-gradient(135deg, hsl(${hueOf(labelName)} 45% 22%), hsl(${hueOf(labelName)} 40% 12%))`,
          color: `hsl(${hueOf(labelName)} 70% 72%)`,
          fontSize: "38%",
          letterSpacing: "0.02em",
        }}
      >
        {initialsOf(labelName)}
      </div>
      {!exhausted && (
        <img
          src={src}
          alt={labelName || "Player"}
          className={`${imgClassName} absolute inset-0 transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );

  return className ? <div className={className}>{content}</div> : content;
}
