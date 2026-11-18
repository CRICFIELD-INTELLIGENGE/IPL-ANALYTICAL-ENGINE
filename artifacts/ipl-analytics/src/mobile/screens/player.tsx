// CRICFIELD Mobile Player Dossier — mobile-first cricket intelligence dossier
// preserving shared identity resolution, team-accurate Hero, and desktop route parity.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useParams } from "wouter";
import { useTeamTheme } from "@/lib/team-context";
import { TeamLogo } from "@/components/team-logo";
import { ErrorBox, Loading } from "../shell";
import { EmptyStumps } from "../art";
import { useMobilePlayer } from "./player/use-mobile-player";
import { CareerSection } from "./player/career-section";
import { BowlingSection, PhasesSection, SeasonsSection } from "./player/phases-seasons-bowling";
import {
  HeadToHeadMobileSection,
  IntelligenceHubMobile,
  RecentAndReportsSection,
  UtilityAndProvenanceFooter,
} from "./player/intelligence-h2h-recent";
import "./player-dossier.css";

const CORE_SECTIONS = ["Career", "Phases", "Seasons", "Bowling"] as const;
const DEEP_SECTIONS = ["Intel Hub", "Intel Reports", "Match History", "Head to Head"] as const;
type SectionTab = (typeof CORE_SECTIONS)[number] | (typeof DEEP_SECTIONS)[number];

export default function MobilePlayer() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { theme } = useTeamTheme();
  const data = useMobilePlayer(slug);
  const [section, setSection] = useState<SectionTab>("Career");
  const dockAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSection("Career");
  }, [slug]);

  const selectSection = (next: SectionTab, el?: HTMLButtonElement | null) => {
    setSection(next);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    const anchor = dockAnchorRef.current;
    if (anchor) {
      const top = anchor.getBoundingClientRect().top + window.scrollY - 60;
      if (window.scrollY > top + 8) {
        window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
      }
    }
  };

  if (data.loading) return <Loading rows={4} h={110} />;
  if (data.error) return <ErrorBox message="Player records could not load." onRetry={data.refetchBios} />;
  if (!data.bio) {
    return (
      <div className="cfm-empty">
        <EmptyStumps />
        <p>We couldn't match “{slug.replace(/-/g, " ")}” to a single verified player.</p>
        <Link href="/pressurelab" className="cfm-btn">
          Search the Pressure Lab
        </Link>
      </div>
    );
  }

  const { bio, displayName, primaryTeam, teamAccent, teamCode, photo, resolvedCountry, bat, bowl, isBowler } = data;

  // Global selected franchise theme subtly tints the page chrome accent (--mpd-accent),
  // while Hero & Collectible Card always lock to the player's own verified team identity (--c).
  const chromeAccent = theme?.accent || teamAccent;

  const headStats: [string, string | number][] =
    isBowler && bowl
      ? [
          ["Wickets", bowl.wickets],
          ["Economy", bowl.econ.toFixed(2)],
          ["Average", bowl.avg.toFixed(1)],
          ["Best", bowl.best],
        ]
      : bat
        ? [
            ["Runs", bat.runs.toLocaleString("en-IN")],
            ["Strike Rate", bat.sr.toFixed(1)],
            ["Average", bat.avg.toFixed(1)],
            ["High Score", `${bat.highest}${bat.highestNotOut ? "*" : ""}`],
          ]
        : [];

  const metaLine = [resolvedCountry, bio.batStyle, bio.bowlStyle].filter((x) => x && x.trim()).join(" · ");

  return (
    <div
      className="mpd"
      style={
        {
          "--mpd-accent": chromeAccent,
        } as CSSProperties
      }
    >
      {/* 2. PLAYER HERO CARD (locked to player's real verified team identity) */}
      <section className="mpd-hero" style={{ ["--c" as string]: teamAccent } as CSSProperties} aria-label={`${displayName} hero`}>
        <div className="mpd-hero-grid" aria-hidden="true" />
        <span className="mpd-hero-wm" aria-hidden="true">
          {(teamCode || "IPL").slice(0, 3)}
        </span>
        {photo && (
          <img
            className="mpd-hero-portrait"
            src={photo}
            alt={displayName}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        <div className="mpd-hero-top-row">
          <div className="mpd-team-chip">
            <TeamLogo team={primaryTeam} size="w-4 h-4" />
            <span>{primaryTeam}</span>
          </div>
          {bio.role && <span className="mpd-role-chip">{bio.role}</span>}
        </div>

        <h1>{displayName}</h1>
        {metaLine && <p className="mpd-hero-meta">{metaLine}</p>}

        {headStats.length > 0 && (
          <div className="mpd-hero-stats">
            {headStats.map(([label, val]) => (
              <div key={label}>
                <strong className="cfm-num">{val}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. SINGLE HORIZONTAL ROW: Career · Phases · Seasons · Bowling | Intel Hub · Intel Reports · Match History · Head to Head */}
      <div ref={dockAnchorRef} aria-hidden="true" />
      <div className="mpd-tabs-dock">
        <nav className="mpd-tabs" aria-label="Player dossier sections">
          {CORE_SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="mpd-tab"
              aria-pressed={section === s}
              onClick={(e) => selectSection(s, e.currentTarget)}
              data-testid={`mpd-tab-${s.toLowerCase()}`}
            >
              {s}
            </button>
          ))}
          <span className="mpd-tabs-vdiv" aria-hidden="true" />
          {DEEP_SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="mpd-tab"
              aria-pressed={section === s}
              onClick={(e) => selectSection(s, e.currentTarget)}
              data-testid={`mpd-tab-${s.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {s}
            </button>
          ))}
        </nav>
      </div>

      {/* 4. ACTIVE SECTION CONTENT */}
      {data.careerLoading ? (
        <div className="mpd-sec">
          <Loading rows={3} h={90} />
        </div>
      ) : section === "Career" ? (
        <CareerSection data={data} onOpenBowling={() => selectSection("Bowling")} />
      ) : section === "Phases" ? (
        <PhasesSection data={data} />
      ) : section === "Seasons" ? (
        <SeasonsSection data={data} />
      ) : section === "Bowling" ? (
        <BowlingSection data={data} />
      ) : section === "Intel Hub" ? (
        <IntelligenceHubMobile data={data} />
      ) : section === "Intel Reports" ? (
        <RecentAndReportsSection data={data} fixedMode="reports" />
      ) : section === "Match History" ? (
        <RecentAndReportsSection data={data} fixedMode="history" />
      ) : (
        <HeadToHeadMobileSection data={data} />
      )}

      {/* 5. UTILITY ACTIONS & PROVENANCE */}
      <UtilityAndProvenanceFooter data={data} />
    </div>
  );
}
