// Mobile Franchise — "the team universe": a banner hero in the franchise colours with its trophies, then the
// season summary, the current squad, the all-time record and the franchise's stories, with routes into the
// Retention Room, Auction War Room and the franchise hub. Every number comes from the existing aggregates.
import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useSquadsBySeason, usePointsTables, useTeams, playerSlug } from "@/lib/aggregates";
import { TEAM_REGISTRY, TEAM_SLUG_MAP, TEAM_CODE_TO_SLUG } from "@/lib/team-context";
import { getV2ForFranchise } from "@/lib/editorial-v2";
import { ErrorBox, Loading, SectionHead } from "../shell";
import { TeamIntelPanel } from "@/components/decision/intel-panels";
import { EmptyStumps } from "../art";

export default function MobileTeam() {
  const { slug = "" } = useParams<{ slug: string }>();
  const code = TEAM_SLUG_MAP[slug];
  const t = code ? TEAM_REGISTRY[code] : undefined;
  const teams = useTeams();
  const points = usePointsTables();
  const squads = useSquadsBySeason();
  const record = teams.data?.find((r) => r.team === t?.name);
  // Latest season that has a points table (the overview's lastSeason can be a filter label such as "All").
  const latest = useMemo(() => Object.keys(points.data ?? {}).filter((k) => /^\d{4}$/.test(k)).sort().at(-1), [points.data]);
  const row = latest && t ? points.data?.[latest]?.find((r) => r.teamCode === t.id || r.team === t.name) : undefined;
  // Same source as the desktop squad tab: the latest season's squad list for this franchise.
  const squadSeason = useMemo(() => Object.keys(squads.data ?? {}).sort().at(-1), [squads.data]);
  const squad = useMemo(() => (t && squadSeason ? squads.data?.[squadSeason]?.[t.name] ?? [] : []), [squads.data, squadSeason, t]);
  const stories = useMemo(() => (code ? getV2ForFranchise(code).slice(0, 4) : []), [code]);

  if (!t) return <div className="cfm-empty"><EmptyStumps /><p>No franchise matches “{slug}”.</p><Link href="/teams" className="cfm-btn">All teams</Link></div>;
  return (
    <div style={{ ["--c" as string]: t.accent }}>
      <section className="mt-hero">
        <img className="banner" src={t.bannerImg} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <img className="logo" src={t.logoImg} alt={`${t.name} logo`} />
        <h1>{t.name}</h1>
        <p className="cfm-serif" style={{ margin: 0, fontSize: 15 }}>{t.motto}</p>
        {t.titleYears.length > 0 && <div className="mt-trophies" aria-label="Titles">{t.titleYears.map((y) => <span key={y}>🏆 {y}</span>)}</div>}
      </section>

      <section aria-label="Season and record">
        {teams.isLoading ? <Loading rows={1} h={70} /> : teams.isError ? <ErrorBox message="Team records could not load." onRetry={() => void teams.refetch()} /> : (
          <div className="mh-snapshot">
            <div><strong className="cfm-num">{row ? `#${row.position}` : "—"}</strong><span>IPL {latest} finish</span></div>
            <div><strong className="cfm-num">{row ? `${row.wins}–${row.losses}` : "—"}</strong><span>{latest} W–L</span></div>
            <div><strong className="cfm-num">{record ? `${record.winPct.toFixed(0)}%` : "—"}</strong><span>All-time wins</span></div>
          </div>
        )}
      </section>

      <section className="cfm-section cfm-orig">
        <TeamIntelPanel team={t.name} />
      </section>

      <section className="cfm-section">
        <SectionHead kicker={squadSeason ? `Squad ${squadSeason}` : "Squad"} title="Current squad" />
        {squads.isLoading ? <Loading rows={2} h={44} /> : squad.length ? (
          <div className="mt-squad">{squad.map((p) => <Link key={p.name} href={`/players/${playerSlug(p.cricsheetName ?? p.name)}`}>{p.name}<small className="cfm-small" style={{ display: "block" }}>{[p.role, p.country && p.country !== "India" ? p.country : null, p.acquisition === "retained" ? "retained" : null].filter(Boolean).join(" · ")}</small></Link>)}</div>
        ) : <p className="cfm-small">No current squad list on record.</p>}
      </section>

      {record && (
        <section className="cfm-section">
          <SectionHead kicker="All seasons" title="The record" />
          <div className="mpl-stats" style={{ marginTop: 0, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[["Played", record.matches], ["Won", record.wins], ["Lost", record.losses], ["Highest", record.highest], ["Bat SR", record.battingSr.toFixed(1)], ["Bowl econ", record.bowlingEcon.toFixed(2)]].map(([l, v]) => <div key={String(l)}><strong className="cfm-num">{v}</strong><span>{l}</span></div>)}
          </div>
        </section>
      )}

      <section className="cfm-section">
        <SectionHead title="Plan the next season" />
        <div className="mt-grid">
          <Link href={`/retention-room/${t.id}`}><strong>Retention</strong><span>Who stays — model, editorial and fan views</span></Link>
          <Link href="/ai-analyst/auction-war-room"><strong>Auction</strong><span>Prices, value and squad needs</span></Link>
          <Link href="/ai-analyst/squad-builder"><strong>Squad builder</strong><span>Best XII from any squad</span></Link>
          <Link href={`/dugout/${TEAM_CODE_TO_SLUG[t.id]}`}><strong>Franchise hub</strong><span>The full {t.shortName} dugout</span></Link>
        </div>
      </section>

      {stories.length > 0 && (
        <section className="cfm-section">
          <SectionHead kicker={`${t.shortName} desk`} title="Stories" more={["Journal", "/reports"]} />
          {stories.map((s) => <Link key={s.id} href={`/dugout/articles/${s.slug}`} className="mh-story" style={{ ["--c" as string]: t.accent }}><i aria-hidden="true" /><div><span className="cfm-kicker" style={{ fontSize: 10 }}>{s.aspect}</span><h3>{s.title}</h3><p>{s.dek}</p></div></Link>)}
        </section>
      )}
      <p className="cfm-provenance">Records: CRICFIELD warehouse. Points tables: the site's season tables. Titles: the site's franchise registry.</p>
    </div>
  );
}
