import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Award, ChevronDown, ChevronRight, ExternalLink, MapPin, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import {
  normalizeVenueName,
  playerSlug,
  teamColor,
  teamShort,
  venueHref,
  venueHue,
  venueImage,
} from "@/lib/aggregates";
import { Sheet } from "../../shell";
import { fmtDec, fmtInt, type MobileStatsHook } from "./use-mobile-stats";

export function MobileVenuesTab({ state }: { state: MobileStatsHook }) {
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  const cards = useMemo(() => {
    const q = state.debouncedSearch.trim().toLowerCase();
    return state.venueCards.filter(
      (v) =>
        !q ||
        v.venueName.toLowerCase().includes(q) ||
        v.cityName.toLowerCase().includes(q),
    );
  }, [state.venueCards, state.debouncedSearch]);

  const visible = cards.slice(0, limit);

  const getVenueDetail = (venueName: string) => {
    const games = state.activeMatches.filter(
      (m: any) => m.venue && normalizeVenueName(m.venue).toLowerCase() === venueName.toLowerCase(),
    );
    const byTeam = new Map<string, { team: string; played: number; wins: number }>();
    for (const m of games) {
      for (const rawTeam of [m.team1, m.team2]) {
        const sh = teamShort(rawTeam);
        if (!sh) continue;
        const prev = byTeam.get(sh) ?? { team: sh, played: 0, wins: 0 };
        prev.played += 1;
        if (m.winner && teamShort(m.winner) === sh) prev.wins += 1;
        byTeam.set(sh, prev);
      }
    }
    const dominance = [...byTeam.values()]
      .sort((a, b) => b.wins - a.wins || b.played - a.played)
      .slice(0, 6);
    return {
      games: games.slice().reverse(),
      dominance,
    };
  };

  if (!cards.length) {
    return (
      <div className="ms3-card">
        <div style={{ font: "700 13px/1.2 var(--m-display)" }}>No stadiums match your filter</div>
        <button type="button" className="ms3-btn" onClick={state.resetAllFilters}>
          Reset Filters
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visible.map((v) => {
        const img = venueImage(v.venueName);
        const hue = venueHue(v.venueName);
        const isOpen = expandedVenue === v.venueName;
        const detail = isOpen ? getVenueDetail(v.venueName) : null;
        return (
          <div key={v.venueName} className="ms3-card" style={{ overflow: "hidden", padding: 0, gap: 0 }}>
            <button
              type="button"
              onClick={() => setExpandedVenue(isOpen ? null : v.venueName)}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                background: "transparent",
                padding: 0,
              }}
              data-testid={`ms3-venue-${v.venueName.slice(0, 12)}`}
            >
              <div
                style={{
                  position: "relative",
                  height: 92,
                  width: "100%",
                  background: `linear-gradient(135deg, hsla(${hue}, 65%, 24%, 0.9), rgba(5, 8, 22, 0.95))`,
                  overflow: "hidden",
                }}
              >
                {img && (
                  <img
                    src={img}
                    alt={v.venueName}
                    loading="lazy"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.45,
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(5,8,22,0.18) 0%, rgba(5,8,22,0.92) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    height: "100%",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ font: "800 13.5px/1.2 var(--m-display)", color: "#f8fafc" }}>
                      {v.venueName}
                    </div>
                    {isOpen ? (
                      <ChevronDown size={15} style={{ color: "#cbd5e1", flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={15} style={{ color: "#cbd5e1", flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, font: "600 11px/1.2 var(--m-ui)", color: "#cbd5e1" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <MapPin size={11} /> {v.cityName}
                    </span>
                    <span>· {fmtInt(v.matches)} matches</span>
                    <span>· Avg RR {v.avgRunRate !== null ? v.avgRunRate.toFixed(2) : "—"}</span>
                  </div>
                </div>
              </div>
            </button>

            {isOpen && detail && (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div className="ms3-scope-label" style={{ marginBottom: 6 }}>Team Dominance at Ground</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {detail.dominance.map((d) => (
                      <div
                        key={d.team}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 8px",
                          borderRadius: 7,
                          background: "var(--ms-muted-bg)",
                          border: "1px solid var(--ms-border)",
                          fontSize: 11,
                        }}
                      >
                        <TeamLogo team={d.team} size="w-3.5 h-3.5" />
                        <strong style={{ color: teamColor(d.team) }}>{d.team}</strong>
                        <span style={{ color: "var(--ms-muted)" }}>
                          {d.wins}W / {d.played}M
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="ms3-scope-label" style={{ marginBottom: 4 }}>Recent Fixtures ({detail.games.length})</div>
                  <div className="ms3-divider">
                    {detail.games.slice(0, 6).map((m: any) => (
                      <Link
                        key={m.id}
                        href={`/match/${m.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "7px 0",
                          textDecoration: "none",
                          color: "var(--ms-text)",
                          fontSize: 11.5,
                        }}
                      >
                        <span>
                          <strong>{teamShort(m.team1)}</strong> vs <strong>{teamShort(m.team2)}</strong>
                        </span>
                        <span style={{ color: "var(--ms-muted)", fontFamily: "var(--m-mono)", fontSize: 10.5 }}>
                          {String(m.date || "").slice(0, 10)} · {m.winner ? `${teamShort(m.winner)} won` : "NR"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link
                    href={venueHref(v.venueName)}
                    className="ms3-pill"
                    style={{ textDecoration: "none", color: "var(--ms-accent)", borderColor: "var(--ms-accent-line)" }}
                  >
                    Open Stadium Profile <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {cards.length > limit && (
        <button type="button" className="ms3-btn" onClick={() => setLimit((n) => n + 20)}>
          Show 20 more stadiums ({cards.length - limit} remaining)
        </button>
      )}
    </div>
  );
}

type RecordCategory = "batting" | "bowling" | "team" | "keepers" | "partnerships";

interface MobileRecordDef {
  id: string;
  label: string;
  subtitle: string;
  value: string;
  holder: string;
  context: string;
  metricName: string;
  metricValue: (row: any) => string | number;
  list: any[];
  isBatter: boolean;
  isHistorical?: boolean;
}

export function MobileRecordBookTab({ state }: { state: MobileStatsHook }) {
  const [cat, setCat] = useState<RecordCategory>("batting");
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);

  const isSliced = !state.isDefaultCareerView;
  const fixtureRecordsAvailable = !state.deliveryScopeActive && state.activeMatches.length > 0;

  const records = useMemo<Record<string, MobileRecordDef>>(() => {
    const batters = state.activeData.batters;
    const bowlers = state.activeData.bowlers;

    const byRuns = [...batters].sort((a, b) => (b.runs || 0) - (a.runs || 0));
    const byHighest = [...batters].sort((a, b) => (b.highest || 0) - (a.highest || 0));
    const byAvg = [...batters].filter((b) => (b.innings || 0) >= 3).sort((a, b) => (b.avg || 0) - (a.avg || 0));
    const bySixes = [...batters].sort((a, b) => (b.sixes || 0) - (a.sixes || 0));
    const byFours = [...batters].sort((a, b) => (b.fours || 0) - (a.fours || 0));
    const by100s = [...batters].sort((a, b) => (b.hundreds || 0) - (a.hundreds || 0));
    const by50s = [...batters].sort((a, b) => (b.fifties || 0) - (a.fifties || 0));
    const bySr = [...batters].filter((b) => (b.runs || 0) >= 50).sort((a, b) => (b.sr || 0) - (a.sr || 0));
    const byBndPct = [...batters].filter((b) => (b.innings || 0) >= 3).sort((a, b) => (b.boundaryPct || 0) - (a.boundaryPct || 0));

    const byWkts = [...bowlers].sort((a, b) => (b.wickets || 0) - (a.wickets || 0));
    const parseW = (s: string) => (s?.includes("/") ? parseInt(s.split("/")[0], 10) || 0 : 0);
    const parseR = (s: string) => (s?.includes("/") ? parseInt(s.split("/")[1], 10) || 999 : 999);
    const byBest = [...bowlers]
      .filter((b) => b.best && b.best !== "-")
      .sort((a, b) => {
        const w = parseW(b.best) - parseW(a.best);
        return w !== 0 ? w : parseR(a.best) - parseR(b.best);
      });
    const byEcon = [...bowlers].filter((b) => (parseFloat(b.overs) || 0) >= 5).sort((a, b) => a.econ - b.econ);
    const byBowlSr = [...bowlers].filter((b) => (parseFloat(b.overs) || 0) >= 5 && b.sr > 0).sort((a, b) => a.sr - b.sr);
    const byFourW = [...bowlers].sort((a, b) => (b.fourW || 0) - (a.fourW || 0));
    const byFiveW = [...bowlers].sort((a, b) => (b.fiveW || 0) - (a.fiveW || 0));

    // Team innings from activeMatches
    const inningsList = fixtureRecordsAvailable
      ? state.activeMatches
          .flatMap((m: any) => [
            { team: m.team1, opponent: m.team2, score: m.team1Score, match: m },
            { team: m.team2, opponent: m.team1, score: m.team2Score, match: m },
          ])
          .flatMap((row: any) => {
            const runs = Number.parseInt(row.score ?? "", 10);
            return Number.isFinite(runs) ? [{ ...row, runs }] : [];
          })
      : [];

    const topTotals = [...inningsList]
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 20)
      .map((r) => ({
        player: r.team,
        team: teamShort(r.team),
        value: r.score,
        innings: `vs ${teamShort(r.opponent)}, ${r.match.season}`,
        matchId: r.match.id,
      }));

    const lowTotals = [...inningsList]
      .sort((a, b) => a.runs - b.runs)
      .slice(0, 20)
      .map((r) => ({
        player: r.team,
        team: teamShort(r.team),
        value: r.score,
        innings: `vs ${teamShort(r.opponent)}, ${r.match.season}`,
        matchId: r.match.id,
      }));

    const dict: Record<string, MobileRecordDef> = {
      orange_cap: {
        id: "orange_cap",
        label: "Most Runs (Orange Cap)",
        subtitle: "Leading run-scorers in active slice",
        value: byRuns[0] ? `${fmtInt(byRuns[0].runs)} Runs` : "—",
        holder: byRuns[0]?.player ?? "N/A",
        context: byRuns[0] ? `${byRuns[0].innings} Inns · Avg ${fmtDec(byRuns[0].avg, 1)}` : "No matching rows",
        metricName: "Runs",
        metricValue: (r) => fmtInt(r.runs),
        list: byRuns,
        isBatter: true,
      },
      highest_score: {
        id: "highest_score",
        label: "Highest Individual Score",
        subtitle: "Peak innings score",
        value: byHighest[0] ? `${fmtInt(byHighest[0].highest)}` : "—",
        holder: byHighest[0]?.player ?? "N/A",
        context: byHighest[0] ? `SR ${fmtDec(byHighest[0].sr, 1)}` : "No matching rows",
        metricName: "HS",
        metricValue: (r) => fmtInt(r.highest),
        list: byHighest,
        isBatter: true,
      },
      highest_avg: {
        id: "highest_avg",
        label: "Highest Batting Average",
        subtitle: "Min 3 innings",
        value: byAvg[0] ? `${fmtDec(byAvg[0].avg, 2)}` : "—",
        holder: byAvg[0]?.player ?? "N/A",
        context: byAvg[0] ? `${fmtInt(byAvg[0].runs)} runs` : "No matching rows",
        metricName: "Avg",
        metricValue: (r) => fmtDec(r.avg, 2),
        list: byAvg,
        isBatter: true,
      },
      aramco_sixes: {
        id: "aramco_sixes",
        label: "Most Sixes",
        subtitle: "Maximum boundaries",
        value: bySixes[0] ? `${fmtInt(bySixes[0].sixes)} Sixes` : "—",
        holder: bySixes[0]?.player ?? "N/A",
        context: bySixes[0] ? `SR ${fmtDec(bySixes[0].sr, 1)}` : "No matching rows",
        metricName: "6s",
        metricValue: (r) => fmtInt(r.sixes),
        list: bySixes,
        isBatter: true,
      },
      rupay_fours: {
        id: "rupay_fours",
        label: "Most Fours",
        subtitle: "Ground boundary hits",
        value: byFours[0] ? `${fmtInt(byFours[0].fours)} Fours` : "—",
        holder: byFours[0]?.player ?? "N/A",
        context: byFours[0] ? `Runs ${fmtInt(byFours[0].runs)}` : "No matching rows",
        metricName: "4s",
        metricValue: (r) => fmtInt(r.fours),
        list: byFours,
        isBatter: true,
      },
      most_100s: {
        id: "most_100s",
        label: "Most Centuries",
        subtitle: "100+ milestones",
        value: by100s[0] ? `${fmtInt(by100s[0].hundreds)}` : "—",
        holder: by100s[0]?.player ?? "N/A",
        context: by100s[0] ? `${fmtInt(by100s[0].runs)} runs` : "No matching rows",
        metricName: "100s",
        metricValue: (r) => fmtInt(r.hundreds),
        list: by100s,
        isBatter: true,
      },
      most_50s: {
        id: "most_50s",
        label: "Most Fifties",
        subtitle: "50–99 milestones",
        value: by50s[0] ? `${fmtInt(by50s[0].fifties)}` : "—",
        holder: by50s[0]?.player ?? "N/A",
        context: by50s[0] ? `${fmtInt(by50s[0].runs)} runs` : "No matching rows",
        metricName: "50s",
        metricValue: (r) => fmtInt(r.fifties),
        list: by50s,
        isBatter: true,
      },
      super_striker: {
        id: "super_striker",
        label: "Highest Strike Rate",
        subtitle: "Min 50 runs",
        value: bySr[0] ? `${fmtDec(bySr[0].sr, 1)} SR` : "—",
        holder: bySr[0]?.player ?? "N/A",
        context: bySr[0] ? `${fmtInt(bySr[0].runs)} runs (${fmtInt(bySr[0].balls)}b)` : "No matching rows",
        metricName: "SR",
        metricValue: (r) => fmtDec(r.sr, 1),
        list: bySr,
        isBatter: true,
      },
      boundary_pct: {
        id: "boundary_pct",
        label: "Highest Boundary %",
        subtitle: "Min 3 innings",
        value: byBndPct[0] ? `${fmtDec(byBndPct[0].boundaryPct, 1)}%` : "—",
        holder: byBndPct[0]?.player ?? "N/A",
        context: byBndPct[0] ? `4s/6s ${fmtInt((byBndPct[0].fours || 0) + (byBndPct[0].sixes || 0))}` : "No matching rows",
        metricName: "Bnd%",
        metricValue: (r) => `${fmtDec(r.boundaryPct, 1)}%`,
        list: byBndPct,
        isBatter: true,
      },
      // Bowling
      purple_cap: {
        id: "purple_cap",
        label: "Most Wickets (Purple Cap)",
        subtitle: "Leading wicket-takers",
        value: byWkts[0] ? `${fmtInt(byWkts[0].wickets)} Wkts` : "—",
        holder: byWkts[0]?.player ?? "N/A",
        context: byWkts[0] ? `Econ ${fmtDec(byWkts[0].econ, 2)}` : "No matching rows",
        metricName: "Wkts",
        metricValue: (r) => fmtInt(r.wickets),
        list: byWkts,
        isBatter: false,
      },
      best_bowling: {
        id: "best_bowling",
        label: "Best Bowling Figures",
        subtitle: "Single innings haul",
        value: byBest[0]?.best ?? "—",
        holder: byBest[0]?.player ?? "N/A",
        context: byBest[0] ? `${fmtInt(byBest[0].wickets)} total wkts` : "No matching rows",
        metricName: "BBI",
        metricValue: (r) => r.best,
        list: byBest,
        isBatter: false,
      },
      best_econ: {
        id: "best_econ",
        label: "Best Economy Rate",
        subtitle: "Min 5 overs",
        value: byEcon[0] ? `${fmtDec(byEcon[0].econ, 2)} Econ` : "—",
        holder: byEcon[0]?.player ?? "N/A",
        context: byEcon[0] ? `${fmtInt(byEcon[0].wickets)} wkts` : "No matching rows",
        metricName: "Econ",
        metricValue: (r) => fmtDec(r.econ, 2),
        list: byEcon,
        isBatter: false,
      },
      four_wickets: {
        id: "four_wickets",
        label: "Most 4-Wicket Hauls",
        subtitle: "Single innings 4W",
        value: byFourW[0] ? `${fmtInt(byFourW[0].fourW)}` : "—",
        holder: byFourW[0]?.player ?? "N/A",
        context: byFourW[0] ? `Wkts ${fmtInt(byFourW[0].wickets)}` : "No matching rows",
        metricName: "4W",
        metricValue: (r) => fmtInt(r.fourW),
        list: byFourW,
        isBatter: false,
      },
      five_wickets: {
        id: "five_wickets",
        label: "Most 5-Wicket Hauls",
        subtitle: "Single innings 5W",
        value: byFiveW[0] ? `${fmtInt(byFiveW[0].fiveW)}` : "—",
        holder: byFiveW[0]?.player ?? "N/A",
        context: byFiveW[0] ? `Wkts ${fmtInt(byFiveW[0].wickets)}` : "No matching rows",
        metricName: "5W",
        metricValue: (r) => fmtInt(r.fiveW),
        list: byFiveW,
        isBatter: false,
      },
      best_bowling_sr: {
        id: "best_bowling_sr",
        label: "Best Bowling Strike Rate",
        subtitle: "Min 5 overs",
        value: byBowlSr[0] ? `${fmtDec(byBowlSr[0].sr, 1)} SR` : "—",
        holder: byBowlSr[0]?.player ?? "N/A",
        context: byBowlSr[0] ? `${fmtInt(byBowlSr[0].wickets)} wkts` : "No matching rows",
        metricName: "SR",
        metricValue: (r) => fmtDec(r.sr, 1),
        list: byBowlSr,
        isBatter: false,
      },
      // Team records (live when fixtureRecordsAvailable)
      highest_total: topTotals.length
        ? {
            id: "highest_total",
            label: "Highest Team Total",
            subtitle: "Peak innings score in scope",
            value: topTotals[0].value,
            holder: topTotals[0].player,
            context: topTotals[0].innings,
            metricName: "Score",
            metricValue: (r) => r.value,
            list: topTotals,
            isBatter: true,
          }
        : {
            id: "highest_total",
            label: "Highest Team Total",
            subtitle: "All-Time Archive",
            value: "287/3",
            holder: "Sunrisers Hyderabad",
            context: "vs RCB, Bengaluru 2024",
            metricName: "Score",
            metricValue: (r) => r.value,
            isBatter: true,
            isHistorical: true,
            list: [
              { player: "Sunrisers Hyderabad", team: "SRH", value: "287/3", innings: "vs RCB, Bengaluru 2024" },
              { player: "Sunrisers Hyderabad", team: "SRH", value: "277/3", innings: "vs MI, Hyderabad 2024" },
              { player: "Kolkata Knight Riders", team: "KKR", value: "272/7", innings: "vs DC, Vizag 2024" },
            ],
          },
      lowest_total: lowTotals.length
        ? {
            id: "lowest_total",
            label: "Lowest Team Total",
            subtitle: "Smallest completed total in scope",
            value: lowTotals[0].value,
            holder: lowTotals[0].player,
            context: lowTotals[0].innings,
            metricName: "Score",
            metricValue: (r) => r.value,
            list: lowTotals,
            isBatter: true,
          }
        : {
            id: "lowest_total",
            label: "Lowest Team Total",
            subtitle: "All-Time Archive",
            value: "49 All Out",
            holder: "Royal Challengers Bengaluru",
            context: "vs KKR, Kolkata 2017",
            metricName: "Score",
            metricValue: (r) => r.value,
            isBatter: true,
            isHistorical: true,
            list: [
              { player: "Royal Challengers Bengaluru", team: "RCB", value: "49 All Out", innings: "vs KKR, Kolkata 2017" },
              { player: "Rajasthan Royals", team: "RR", value: "58 All Out", innings: "vs RCB, Cape Town 2009" },
            ],
          },
      // Historical keepers & partnerships archive
      most_dismissals: {
        id: "most_dismissals",
        label: "Most Keeper Dismissals",
        subtitle: "Historical Career Archive",
        value: "190",
        holder: "MS Dhoni",
        context: "Career Archive Record",
        metricName: "Dismissals",
        metricValue: (r) => r.value,
        isBatter: true,
        isHistorical: true,
        list: [
          { player: "MS Dhoni", team: "CSK", value: "190 Dismissals", innings: "Career Archive" },
          { player: "Dinesh Karthik", team: "RCB", value: "174 Dismissals", innings: "Career Archive" },
          { player: "Wriddhiman Saha", team: "GT", value: "114 Dismissals", innings: "Career Archive" },
        ],
      },
      most_catches: {
        id: "most_catches",
        label: "Most Outfield Catches",
        subtitle: "Historical Career Archive",
        value: "114",
        holder: "Suresh Raina",
        context: "Career Archive Record",
        metricName: "Catches",
        metricValue: (r) => r.value,
        isBatter: true,
        isHistorical: true,
        list: [
          { player: "Suresh Raina", team: "CSK", value: "109 Catches", innings: "Career Archive" },
          { player: "Virat Kohli", team: "RCB", value: "106 Catches", innings: "Career Archive" },
          { player: "Kieron Pollard", team: "MI", value: "103 Catches", innings: "Career Archive" },
        ],
      },
      highest_partnership: {
        id: "highest_partnership",
        label: "Highest Partnership",
        subtitle: "Historical Career Archive",
        value: "229",
        holder: "Kohli & AB de Villiers",
        context: "vs GL, Bengaluru 2016",
        metricName: "Stand",
        metricValue: (r) => r.value,
        isBatter: true,
        isHistorical: true,
        list: [
          { player: "Virat Kohli & AB de Villiers", team: "RCB", value: "229 Runs", innings: "vs GL, 2016" },
          { player: "Virat Kohli & AB de Villiers", team: "RCB", value: "215* Runs", innings: "vs MI, 2015" },
        ],
      },
      highest_1st: {
        id: "highest_1st",
        label: "Highest 1st-Wicket Stand",
        subtitle: "Historical Career Archive",
        value: "210*",
        holder: "Rahul & De Kock",
        context: "vs KKR, 2022",
        metricName: "Stand",
        metricValue: (r) => r.value,
        isBatter: true,
        isHistorical: true,
        list: [
          { player: "KL Rahul & Quinton de Kock", team: "LSG", value: "210* Runs", innings: "vs KKR, 2022" },
          { player: "Devdutt Padikkal & Virat Kohli", team: "RCB", value: "181* Runs", innings: "vs RR, 2021" },
        ],
      },
    };
    return dict;
  }, [state.activeData, state.activeMatches, fixtureRecordsAvailable]);

  const catKeys: Record<RecordCategory, string[]> = {
    batting: ["orange_cap", "highest_score", "highest_avg", "aramco_sixes", "most_100s", "most_50s", "super_striker", "rupay_fours", "boundary_pct"],
    bowling: ["purple_cap", "best_bowling", "best_econ", "four_wickets", "five_wickets", "best_bowling_sr"],
    team: ["highest_total", "lowest_total"],
    keepers: ["most_dismissals", "most_catches"],
    partnerships: ["highest_partnership", "highest_1st"],
  };

  const keysForCat = (catKeys[cat] ?? []).filter((k) => !(isSliced && records[k]?.isHistorical));
  const activeRecord = openRecordId ? records[openRecordId] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ms3-hscroll">
        {(
          [
            ["batting", "Batting"],
            ["bowling", "Bowling"],
            ["team", "Team Records"],
            ["keepers", "Keepers & Fielding"],
            ["partnerships", "Partnerships"],
          ] as [RecordCategory, string][]
        ).map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            className="ms3-pill"
            data-active={cat === id}
            onClick={() => setCat(id)}
            data-testid={`ms3-rec-cat-${id}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {keysForCat.length === 0 ? (
        <div className="ms3-card">
          <div style={{ font: "700 13px/1.2 var(--m-display)" }}>
            Historical Archive Only
          </div>
          <p style={{ margin: 0, font: "500 12px/1.4 var(--m-ui)", color: "var(--ms-muted)" }}>
            This category holds All-Time Career Archive records and is hidden while custom dimensional slices are active. Reset filters to inspect archive milestones.
          </p>
          <button type="button" className="ms3-btn" onClick={state.resetAllFilters}>
            View Full Career Archive
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {keysForCat.map((k) => {
            const rec = records[k];
            if (!rec) return null;
            return (
              <button
                key={rec.id}
                type="button"
                className="ms3-card"
                style={{
                  textAlign: "left",
                  width: "100%",
                  gap: 6,
                }}
                onClick={() => setOpenRecordId(rec.id)}
                data-testid={`ms3-record-${rec.id}`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "700 11px/1.2 var(--m-mono)", color: "var(--ms-accent)" }}>
                    {rec.isHistorical ? <Award size={12} /> : <Trophy size={12} />}
                    {rec.isHistorical ? "ALL-TIME ARCHIVE" : "LIVE SLICE RECORD"}
                  </span>
                  <ChevronRight size={14} style={{ color: "var(--ms-muted)" }} />
                </div>

                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, width: "100%" }}>
                  <div style={{ font: "700 13.5px/1.2 var(--m-display)", color: "var(--ms-text)" }}>
                    {rec.label}
                  </div>
                  <div style={{ font: "800 16px/1.1 var(--m-display)", color: "var(--ms-accent)", flexShrink: 0 }}>
                    {rec.value}
                  </div>
                </div>

                <div style={{ font: "600 12px/1.25 var(--m-ui)", color: "var(--ms-text)" }}>
                  {state.formatName(rec.holder)}
                </div>
                <div style={{ font: "500 11px/1.25 var(--m-ui)", color: "var(--ms-muted)" }}>
                  {rec.subtitle} · {rec.context}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeRecord && (
        <Sheet title={activeRecord.label} onClose={() => setOpenRecordId(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ font: "500 11.5px/1.35 var(--m-ui)", color: "var(--ms-muted)", marginBottom: 4 }}>
              Top 20 leaderboard ({activeRecord.isHistorical ? "Historical Career Archive" : "Live Filtered Leaderboard"})
            </div>
            {activeRecord.list.slice(0, 20).map((row, idx) => {
              const label = row.player ? state.formatName(row.player) : "—";
              const sh = teamShort(row.team || state.getPlayerTeam(row.player, row));
              const isIndividualPlayer = row.player && !row.matchId && !activeRecord.isHistorical;
              return (
                <div
                  key={`${label}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--ms-muted-bg)",
                    border: "1px solid var(--ms-border)",
                  }}
                >
                  <span style={{ width: 22, font: "700 11px/1 var(--m-mono)", color: idx < 3 ? "var(--ms-accent)" : "var(--ms-muted)" }}>
                    {idx + 1}
                  </span>
                  {row.matchId ? (
                    <TeamLogo team={sh} size="w-7 h-7" />
                  ) : (
                    <PlayerAvatar
                      name={row.player || ""}
                      teamId={sh}
                      playerImages={state.playerImages}
                      bio={state.getBioFor(row.player || "")}
                      className="w-7 h-7 rounded-full shrink-0"
                      disableHover
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isIndividualPlayer ? (
                      <Link
                        href={`/players/${playerSlug(row.player)}`}
                        style={{ font: "700 12.5px/1.2 var(--m-display)", color: "var(--ms-text)", textDecoration: "none" }}
                      >
                        {label}
                      </Link>
                    ) : row.matchId ? (
                      <Link
                        href={`/match/${row.matchId}`}
                        style={{ font: "700 12.5px/1.2 var(--m-display)", color: "var(--ms-text)", textDecoration: "none" }}
                      >
                        {label}
                      </Link>
                    ) : (
                      <span style={{ font: "700 12.5px/1.2 var(--m-display)", color: "var(--ms-text)" }}>{label}</span>
                    )}
                    <div style={{ font: "500 10.5px/1.2 var(--m-ui)", color: "var(--ms-muted)", marginTop: 2 }}>
                      {row.innings || sh}
                    </div>
                  </div>
                  <div style={{ font: "800 13px/1.1 var(--m-mono)", color: "var(--ms-accent)", flexShrink: 0 }}>
                    {activeRecord.metricValue(row)}
                  </div>
                </div>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}
