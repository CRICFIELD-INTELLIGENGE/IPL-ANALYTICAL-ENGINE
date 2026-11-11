// Mobile Player — "the dossier": a franchise-coloured hero with the authorised photo and four headline numbers,
// then a sticky section bar (Career · Phases · Seasons · Bowling) with progressive disclosure. Slug resolution and
// stat-row matching use the same helpers as the desktop profile, so both pages agree on who a slug means.
import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { usePlayerBios, usePlayerCareerStats, usePlayerImages, usePlayerSeasonStats, usePlayerLatestTeamResolver, resolvePlayerImage, selectPlayerRows, teamColor, type BatterRow, type BowlerRow } from "@/lib/aggregates";
import { resolvePlayerKey } from "@/lib/player-key";
import { usePlayerIdentityIndex } from "@/lib/player-recent-matches";
import { ErrorBox, Loading, SectionHead } from "../shell";
import { PlayerIntelPanel } from "@/components/decision/intel-panels";
import { EmptyStumps } from "../art";

type SeasonRow = (BatterRow | BowlerRow) & { season: string };
const SECTIONS = ["Career", "Phases", "Seasons", "Bowling"] as const;

export default function MobilePlayer() {
  const { slug = "" } = useParams<{ slug: string }>();
  const bios = usePlayerBios();
  const identity = usePlayerIdentityIndex();
  const career = usePlayerCareerStats();
  const seasons = usePlayerSeasonStats();
  const images = usePlayerImages();
  const latestTeam = usePlayerLatestTeamResolver();
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("Career");

  const key = useMemo(() => (bios.data && !identity.isLoading ? resolvePlayerKey(bios.data, slug, identity.data) : null), [bios.data, slug, identity.isLoading, identity.data]);
  const bio = key ? bios.data?.[key] : undefined;
  const bat = bio && career.data ? selectPlayerRows(career.data.batters, bio.playerName, bio.fullName)[0] : undefined;
  const bowl = bio && career.data ? selectPlayerRows(career.data.bowlers, bio.playerName, bio.fullName)[0] : undefined;
  const timeline = useMemo(() => {
    if (!bio || !seasons.data) return [];
    const b = selectPlayerRows(seasons.data.batters as SeasonRow[], bio.playerName, bio.fullName) as (BatterRow & { season: string })[];
    const w = selectPlayerRows(seasons.data.bowlers as SeasonRow[], bio.playerName, bio.fullName) as (BowlerRow & { season: string })[];
    const yrs = [...new Set([...b, ...w].map((r) => r.season))].sort();
    return yrs.map((y) => ({ season: y, bat: b.find((r) => r.season === y), bowl: w.find((r) => r.season === y) }));
  }, [bio, seasons.data]);

  if (bios.isLoading || identity.isLoading) return <Loading rows={4} h={110} />;
  if (bios.isError) return <ErrorBox message="Player records could not load." onRetry={() => void bios.refetch()} />;
  if (!bio) return <div className="cfm-empty"><EmptyStumps /><p>We couldn't match “{slug.replace(/-/g, " ")}” to a single verified player.</p><Link href="/scout" className="cfm-btn">Search the Scout Lab</Link></div>;

  const name = bio.fullName || bio.playerName;
  const team = latestTeam(bio.playerName) ?? latestTeam(name);
  const colour = team ? teamColor(team) : "#2b4a5a";
  const photo = resolvePlayerImage(bio.playerName, images.data, bio);
  const isBowler = Boolean(bowl && (!bat || bowl.wickets * 25 > bat.runs));
  const head: [string, string | number][] = isBowler && bowl
    ? [["Wkts", bowl.wickets], ["Econ", bowl.econ.toFixed(2)], ["Avg", bowl.avg.toFixed(1)], ["Best", bowl.best]]
    : bat ? [["Runs", bat.runs.toLocaleString("en-IN")], ["SR", bat.sr.toFixed(1)], ["Avg", bat.avg.toFixed(1)], ["HS", bat.highest]] : [];

  return (
    <div style={{ ["--c" as string]: colour }}>
      <section className="mpl-hero">
        <span className="num" aria-hidden="true">{(team ?? "IPL").slice(0, 3)}</span>
        {photo && <img className="portrait" src={photo} alt={`${name}`} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        <div className="tags">{team && <span className="cfm-plate">{team}</span>}{bio.role && <span className="cfm-plate" style={{ background: "transparent", color: "var(--m-ivory)", border: "1px solid var(--m-line)" }}>{bio.role}</span>}</div>
        <h1>{name}</h1>
        <p className="cfm-small" style={{ position: "relative", color: "var(--m-ivory)", margin: 0 }}>{[bio.country, bio.batStyle, bio.bowlStyle].filter((x) => x && x.trim()).join(" · ")}</p>
        {head.length > 0 && <div className="mpl-stats">{head.map(([l, v]) => <div key={l}><strong className="cfm-num">{v}</strong><span>{l}</span></div>)}</div>}
      </section>

      <nav className="mpl-tabs" aria-label="Dossier sections">
        {SECTIONS.map((s) => <button key={s} type="button" className="cfm-chip" aria-pressed={section === s} onClick={() => setSection(s)} disabled={s === "Bowling" && !bowl}>{s}</button>)}
      </nav>

      {career.isLoading ? <Loading rows={2} h={80} /> : section === "Career" ? (
        <section className="cfm-section">
          <SectionHead kicker="IPL career" title="Overview" />
          {bat ? (
            <div className="mpl-stats" style={{ marginTop: 0, gridTemplateColumns: "repeat(3, 1fr)" }}>
              {[["Innings", bat.innings], ["Runs", bat.runs], ["Balls", bat.balls], ["50s / 100s", `${bat.fifties}/${bat.hundreds}`], ["Fours", bat.fours], ["Sixes", bat.sixes]].map(([l, v]) => <div key={String(l)}><strong className="cfm-num">{v}</strong><span>{l}</span></div>)}
            </div>
          ) : <p className="cfm-small">No IPL batting record.</p>}
          {bowl && <p className="cfm-small" style={{ marginTop: 12 }}>Bowling: {bowl.wickets} wickets in {bowl.overs} overs at {bowl.econ.toFixed(2)} an over, best {bowl.best}.</p>}
        </section>
      ) : section === "Phases" ? (
        <section className="cfm-section">
          <SectionHead kicker="Strike rate by phase" title="When they score" />
          {bat ? <PhaseBars rows={[["Powerplay", bat.ppSr], ["Middle", bat.middleSr], ["Death", bat.deathSr]]} max={Math.max(200, bat.ppSr, bat.middleSr, bat.deathSr)} /> : <p className="cfm-small">No IPL batting record.</p>}
          <p className="cfm-small" style={{ marginTop: 10 }}>Career strike rate in each phase; a phase with no balls faced shows 0.</p>
        </section>
      ) : section === "Seasons" ? (
        <section className="cfm-section">
          <SectionHead kicker="Season by season" title="Career timeline" />
          {timeline.length ? (
            <ol className="mpl-timeline">
              {timeline.slice().reverse().map((t) => (
                <li key={t.season}><strong>{t.season}</strong>{t.bat && <span>{t.bat.runs} runs · SR {t.bat.sr.toFixed(1)} · HS {t.bat.highest}</span>}{t.bowl && <span>{t.bowl.wickets} wkts · econ {t.bowl.econ.toFixed(2)}</span>}</li>
              ))}
            </ol>
          ) : <p className="cfm-small">No season records.</p>}
        </section>
      ) : bowl ? (
        <section className="cfm-section">
          <SectionHead kicker="Economy by phase" title="With the ball" />
          <PhaseBars rows={[["Powerplay", bowl.ppEcon ?? 0], ["Middle", bowl.middleEcon ?? 0], ["Death", bowl.deathEcon ?? 0]]} max={14} dp={2} />
          <p className="cfm-small" style={{ marginTop: 10 }}>{bowl.ppWickets} powerplay, {bowl.middleWickets} middle-overs and {bowl.deathWickets} death-overs wickets · dot-ball rate {bowl.dotPct}%.</p>
        </section>
      ) : null}

      <section className="cfm-section cfm-orig"><PlayerIntelPanel player={bio.playerName} /></section>

      <section className="cfm-section" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/scout/compare" className="cfm-btn">Compare</Link>
        <Link href={`/scout?q=${encodeURIComponent(bio.playerName)}`} className="cfm-btn">Scout report</Link>
      </section>
      <p className="cfm-provenance">IPL career and season numbers: CRICFIELD warehouse (Cricsheet ball-by-ball). Biography fields come from the site's player bio file; blank fields are not filled in.</p>
    </div>
  );
}

function PhaseBars({ rows, max, dp = 1 }: { rows: [string, number][]; max: number; dp?: number }) {
  return <div className="mpl-phase">{rows.map(([l, v]) => <div key={l}><span>{l}</span><span className="bar"><i style={{ ["--w" as string]: `${Math.min(100, ((v || 0) / max) * 100)}%` }} /></span><b>{v ? v.toFixed(dp) : "—"}</b></div>)}</div>;
}
