import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Compass,
  Crosshair,
  Flame,
  MapPin,
  Newspaper,
  Scale,
  Search,
  Shield,
  Target,
  X,
} from "lucide-react";
import {
  isSamePlayerName,
  normalizePlayerName,
  teamColor,
  teamShort,
  usePlayerBios,
  useTopBatters,
  useTopBowlers,
  venueHref,
} from "@/lib/aggregates";
import { buildClientMatchupSummary, resolveScorecardName, useRecordedDeliveries } from "@/lib/delivery-data";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import { HeadToHeadGroundVisual } from "@/components/player-intelligence-sections";
import { STORY_TYPE_LABEL } from "@/lib/editorial-v2";
import { TEAM_CODE_TO_SLUG, type TeamCode } from "@/lib/team-context";
import type { MobilePlayerData } from "./use-mobile-player";

function teamHrefFor(name: string): string {
  const short = teamShort(name).toUpperCase() as TeamCode;
  const mapped = TEAM_CODE_TO_SLUG[short];
  if (mapped) return `/teams/${mapped}`;
  return `/teams/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function IntelligenceHubMobile({ data }: { data: MobilePlayerData }) {
  const { bio, displayName, bat, bowl, isBowler, teamAccent, pressureRow, matchAgg, lens, squadHistory, recentMatches } = data;
  const [intelTab, setIntelTab] = useState<"pressure" | "tactical" | "venue" | "evidence">("pressure");

  const lensSummary = useMemo(() => {
    const b = lens.player.data?.balls;
    if (!b || !b.r.length) return null;
    let pBalls = 0,
      pRuns = 0,
      sBalls = 0,
      sRuns = 0,
      dots = 0;
    for (let i = 0; i < b.r.length; i++) {
      if (b.r[i] === 0) dots++;
      if (b.p[i] === 0) {
        pBalls++;
        pRuns += b.r[i];
      } else {
        sBalls++;
        sRuns += b.r[i];
      }
    }
    return {
      total: b.r.length,
      dotPct: Math.round((dots / b.r.length) * 1000) / 10,
      paceSr: pBalls ? (pRuns / pBalls) * 100 : null,
      spinSr: sBalls ? (sRuns / sBalls) * 100 : null,
      paceBalls: pBalls,
      spinBalls: sBalls,
    };
  }, [lens.player.data]);

  // Best & Difficult Grounds / Oppositions (min 3 matches for quality signal)
  const venueSplits = useMemo(() => {
    const qualified = matchAgg.venues.filter((v) => v.matches >= 3 && (isBowler ? v.bowlBalls > 0 : v.balls > 0));
    const pool = qualified.length ? qualified : matchAgg.venues.filter((v) => (isBowler ? v.bowlBalls > 0 : v.balls > 0));
    const sorted = [...pool].sort((a, b) =>
      isBowler ? a.econ - b.econ || b.wickets - a.wickets : b.sr - a.sr || b.runs - a.runs,
    );
    return {
      best: sorted.slice(0, 2),
      difficult: sorted.length > 2 ? [...sorted].reverse().slice(0, 2) : [],
    };
  }, [matchAgg.venues, isBowler]);

  const oppSplits = useMemo(() => {
    const qualified = matchAgg.oppositions.filter((o) => o.matches >= 3 && (isBowler ? o.bowlBalls > 0 : o.balls > 0));
    const pool = qualified.length ? qualified : matchAgg.oppositions.filter((o) => (isBowler ? o.bowlBalls > 0 : o.balls > 0));
    const sorted = [...pool].sort((a, b) =>
      isBowler ? a.econ - b.econ || b.wickets - a.wickets : b.sr - a.sr || b.runs - a.runs,
    );
    return {
      best: sorted.slice(0, 2),
      difficult: sorted.length > 2 ? [...sorted].reverse().slice(0, 2) : [],
    };
  }, [matchAgg.oppositions, isBowler]);

  // Deterministic, number-backed Performance Evidence bullets
  const evidenceBullets = useMemo(() => {
    const list: string[] = [];
    if (pressureRow?.pressure?.rate != null && pressureRow?.ordinary?.rate != null) {
      const dec = isBowler ? 2 : 1;
      const unit = isBowler ? "econ" : "SR";
      const diff = Number(pressureRow.pressure.rate) - Number(pressureRow.ordinary.rate);
      list.push(
        `Pressure leverage: ${Number(pressureRow.pressure.rate).toFixed(dec)} ${unit} vs ${Number(pressureRow.ordinary.rate).toFixed(dec)} ${unit} baseline across ${pressureRow.pressureMatches} high-leverage fixtures (${diff >= 0 ? "+" : ""}${diff.toFixed(dec)}).`,
      );
    }
    if (!isBowler && bat) {
      if (bat.deathSr > bat.ppSr + 18 && bat.deathSr > 0) {
        list.push(`Strike rate accelerates sharply in death overs: ${bat.deathSr.toFixed(1)} SR in overs 16–20 vs ${bat.ppSr.toFixed(1)} SR in Powerplay.`);
      } else if (bat.middleSr >= 132) {
        list.push(`Controls middle overs (7–15) at ${bat.middleSr.toFixed(1)} SR with ${bat.boundaryPct?.toFixed?.(1) ?? "—"}% boundary share.`);
      }
      if (lensSummary?.paceSr != null && lensSummary?.spinSr != null && lensSummary.paceBalls >= 20 && lensSummary.spinBalls >= 20) {
        list.push(
          `Pace vs spin split: ${lensSummary.paceSr.toFixed(1)} SR vs pace (${lensSummary.paceBalls} balls) and ${lensSummary.spinSr.toFixed(1)} SR vs spin (${lensSummary.spinBalls} balls).`,
        );
      }
    } else if (bowl) {
      list.push(
        `Containment profile: ${bowl.dotPct.toFixed(1)}% dot balls overall with ${(bowl.ppEcon ?? 0).toFixed(2)} PP econ and ${(bowl.deathEcon ?? 0).toFixed(2)} death econ.`,
      );
      if (bowl.trueEconomy != null) {
        list.push(
          `Relative economy delta: ${bowl.trueEconomy > 0 ? "+" : ""}${bowl.trueEconomy.toFixed(2)} runs/over compared to league par across ${bowl.overs} overs.`,
        );
      }
    }
    if (matchAgg.chase.matches >= 4 && matchAgg.defend.matches >= 4) {
      list.push(
        isBowler
          ? `Chase defense: ${(matchAgg.chase.econ ?? 0).toFixed(2)} econ while defending targets vs ${(matchAgg.defend.econ ?? 0).toFixed(2)} econ bowling first.`
          : `Situational innings split: ${(matchAgg.chase.sr ?? 0).toFixed(1)} SR chasing (${matchAgg.chase.winPct ?? "—"}% win rate) vs ${(matchAgg.defend.sr ?? 0).toFixed(1)} SR setting targets.`,
      );
    }
    if (venueSplits.best[0]) {
      const bv = venueSplits.best[0];
      list.push(
        isBowler
          ? `Top venue efficiency: ${bv.venue} (${bv.wickets} wkts in ${bv.matches} games at ${bv.econ.toFixed(2)} econ).`
          : `Most productive ground: ${bv.venue} (${bv.runs} runs in ${bv.matches} games at ${bv.sr.toFixed(1)} SR).`,
      );
    }
    return list;
  }, [pressureRow, isBowler, bat, bowl, lensSummary, matchAgg, venueSplits]);

  if (!bio) return null;

  return (
    <div className="mpd-sec">
      <div className="mpd-sec-head">
        <div>
          <span className="mpd-kicker">Calculated Dossier</span>
          <h2 className="mpd-title">Player Intelligence Hub</h2>
        </div>
        <span style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)" }}>
          {recentMatches.length} matches indexed
        </span>
      </div>

      <div className="mpd-subpills" role="tablist" aria-label="Intelligence hub modules" style={{ flexWrap: "wrap" }}>
        <button
          type="button"
          className="mpd-subpill"
          data-active={intelTab === "pressure"}
          onClick={() => setIntelTab("pressure")}
        >
          Pressure &amp; Clutch
        </button>
        <button
          type="button"
          className="mpd-subpill"
          data-active={intelTab === "tactical"}
          onClick={() => setIntelTab("tactical")}
        >
          Tactical
        </button>
        <button
          type="button"
          className="mpd-subpill"
          data-active={intelTab === "venue"}
          onClick={() => setIntelTab("venue")}
        >
          Venues &amp; Opps ({matchAgg.venues.length})
        </button>
        <button
          type="button"
          className="mpd-subpill"
          data-active={intelTab === "evidence"}
          onClick={() => setIntelTab("evidence")}
        >
          Evidence ({evidenceBullets.length})
        </button>
      </div>

      {/* 9A. Pressure & Clutch */}
      {intelTab === "pressure" && (
      <div className="mpd-intel-card">
        <div className="mpd-intel-body" style={{ borderTop: 0, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <Flame size={16} style={{ color: "#f472b6" }} />
            <div>
              <div style={{ font: "800 13.5px/1.15 var(--m-display)" }}>Pressure &amp; Clutch</div>
              <div style={{ font: "600 10.5px/1.25 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                High-leverage rate · chase/defend · win correlation
              </div>
            </div>
          </div>
          <div className="mpd-grid-2">
            <div className="mpd-kpi">
                <div className="mpd-kpi-k">Pressure Rate</div>
                <div className="mpd-kpi-v" style={{ color: "#f472b6" }}>
                  {pressureRow?.pressure?.rate != null
                    ? `${Number(pressureRow.pressure.rate).toFixed(isBowler ? 2 : 1)} ${isBowler ? "ec" : "SR"}`
                    : "Unavailable"}
                </div>
                <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                  {pressureRow ? `${pressureRow.pressureMatches} pressure games` : "No qualifying pressure sample"}
                </div>
              </div>
              <div className="mpd-kpi">
                <div className="mpd-kpi-k">Baseline vs Lift</div>
                <div className="mpd-kpi-v">
                  {pressureRow?.ordinary?.rate != null
                    ? Number(pressureRow.ordinary.rate).toFixed(isBowler ? 2 : 1)
                    : "—"}
                </div>
                <div style={{ font: "600 10px/1.2 var(--m-mono)", color: pressureRow?.rateLift != null && pressureRow.rateLift >= 0 ? "#34d399" : "var(--m-muted)", marginTop: 2 }}>
                  {pressureRow?.rateLift != null
                    ? `Lift ${pressureRow.rateLift > 0 ? "+" : ""}${Number(pressureRow.rateLift).toFixed(isBowler ? 2 : 1)}`
                    : "Clutch Delta"}
                </div>
              </div>
              <div className="mpd-kpi">
                <div className="mpd-kpi-k">Chasing Record</div>
                <div className="mpd-kpi-v">
                  {matchAgg.chase.winPct != null ? `${matchAgg.chase.winPct}% Win` : "—"}
                </div>
                <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                  {matchAgg.chase.matches} chases ({isBowler ? `${matchAgg.chase.wickets}W` : `${matchAgg.chase.runs}r`})
                </div>
              </div>
              <div className="mpd-kpi">
                <div className="mpd-kpi-k">Defending Record</div>
                <div className="mpd-kpi-v">
                  {matchAgg.defend.winPct != null ? `${matchAgg.defend.winPct}% Win` : "—"}
                </div>
                <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                  {matchAgg.defend.matches} defenses ({isBowler ? `${matchAgg.defend.wickets}W` : `${matchAgg.defend.runs}r`})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9B. Tactical Intelligence */}
      {intelTab === "tactical" && (
      <div className="mpd-intel-card">
        <div className="mpd-intel-body" style={{ borderTop: 0, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <Compass size={16} style={{ color: teamAccent }} />
            <div>
              <div style={{ font: "800 13.5px/1.15 var(--m-display)" }}>Tactical Intelligence</div>
              <div style={{ font: "600 10.5px/1.25 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                Role tendencies · phase usage · pace vs spin
              </div>
            </div>
          </div>
          <div className="mpd-grid-2">
            <div className="mpd-kpi">
                <div className="mpd-kpi-k">Role / Style</div>
                <div className="mpd-kpi-v" style={{ fontSize: 13 }}>{bio.role || (isBowler ? "Bowler" : "Batter")}</div>
                <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                  {bio.batStyle || bio.bowlStyle || "Verified archive"}
                </div>
              </div>
              <div className="mpd-kpi">
                <div className="mpd-kpi-k">{isBowler ? "Death Economy" : "Death SR"}</div>
                <div className="mpd-kpi-v">
                  {isBowler ? (bowl?.deathEcon != null ? bowl.deathEcon.toFixed(2) : "—") : (bat?.deathSr ? bat.deathSr.toFixed(1) : "—")}
                </div>
                <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                  Overs 16–20 efficiency
                </div>
              </div>
              {lensSummary && !isBowler && (
                <>
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">Pace Matchup</div>
                    <div className="mpd-kpi-v">{lensSummary.paceSr != null ? `${lensSummary.paceSr.toFixed(1)} SR` : "—"}</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {lensSummary.paceBalls} balls · {lensSummary.dotPct}% total dots
                    </div>
                  </div>
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">Spin Matchup</div>
                    <div className="mpd-kpi-v">{lensSummary.spinSr != null ? `${lensSummary.spinSr.toFixed(1)} SR` : "—"}</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {lensSummary.spinBalls} balls · {squadHistory.length} editions
                    </div>
                  </div>
                </>
              )}
              {bowl && (bowl.vsLhb || bowl.vsRhb) && (
                <>
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">vs Left-Handers</div>
                    <div className="mpd-kpi-v">{bowl.vsLhb ? `${bowl.vsLhb.wickets}W` : "—"}</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {bowl.vsLhb ? `${bowl.vsLhb.balls}b · SR ${bowl.vsLhb.strikeRate.toFixed(1)}` : "—"}
                    </div>
                  </div>
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">vs Right-Handers</div>
                    <div className="mpd-kpi-v">{bowl.vsRhb ? `${bowl.vsRhb.wickets}W` : "—"}</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {bowl.vsRhb ? `${bowl.vsRhb.balls}b · SR ${bowl.vsRhb.strikeRate.toFixed(1)}` : "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
      </div>
      )}

      {/* 9C. Venue & Opposition */}
      {intelTab === "venue" && (
      <div className="mpd-intel-card">
        <div className="mpd-intel-body" style={{ borderTop: 0, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <MapPin size={16} style={{ color: "#34d399" }} />
            <div>
              <div style={{ font: "800 13.5px/1.15 var(--m-display)" }}>Venue &amp; Opposition</div>
              <div style={{ font: "600 10.5px/1.25 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                Best &amp; tougher grounds ({matchAgg.venues.length}) · Opponents ({matchAgg.oppositions.length})
              </div>
            </div>
          </div>
          {venueSplits.best.length > 0 && (
              <div>
                <div style={{ font: "700 9.5px/1 var(--m-mono)", color: "#34d399", marginBottom: 6 }}>BEST GROUNDS</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {venueSplits.best.map((v) => (
                    <Link
                      key={v.venue}
                      href={venueHref(v.venue)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--mpd-line-soft)",
                        textDecoration: "none",
                        color: "var(--m-text)",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.venue}
                      </span>
                      <span style={{ font: "700 11px/1 var(--m-mono)", color: "#34d399", flexShrink: 0 }}>
                        {isBowler ? `${v.wickets}W · ${v.econ.toFixed(2)}ec` : `${v.runs}r · ${v.sr.toFixed(0)} SR`}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {venueSplits.difficult.length > 0 && (
              <div>
                <div style={{ font: "700 9.5px/1 var(--m-mono)", color: "#fbbf24", marginBottom: 6 }}>TOUGHER GROUNDS</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {venueSplits.difficult.map((v) => (
                    <Link
                      key={v.venue}
                      href={venueHref(v.venue)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid var(--mpd-line-soft)",
                        textDecoration: "none",
                        color: "var(--m-text)",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.venue}
                      </span>
                      <span style={{ font: "700 11px/1 var(--m-mono)", color: "#fbbf24", flexShrink: 0 }}>
                        {isBowler ? `${v.wickets}W · ${v.econ.toFixed(2)}ec` : `${v.runs}r · ${v.sr.toFixed(0)} SR`}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {oppSplits.best.length > 0 && (
              <div>
                <div style={{ font: "700 9.5px/1 var(--m-mono)", color: "#38bdf8", marginBottom: 6 }}>FAVORITE OPPOSITIONS</div>
                <div className="mpd-grid-2">
                  {oppSplits.best.map((o) => (
                    <Link
                      key={o.team}
                      href={teamHrefFor(o.team)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--mpd-line-soft)",
                        textDecoration: "none",
                        color: "var(--m-text)",
                      }}
                    >
                      <div style={{ font: "800 11.5px/1 var(--m-mono)", color: teamColor(o.team) }}>
                        {teamShort(o.team)} · {o.matches}m
                      </div>
                      <div style={{ font: "700 11px/1.3 var(--m-mono)", color: "var(--m-text)", marginTop: 4 }}>
                        {isBowler ? `${o.wickets}W · ${o.econ.toFixed(2)}ec` : `${o.runs}r · ${o.sr.toFixed(0)} SR`}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {oppSplits.difficult.length > 0 && (
              <div>
                <div style={{ font: "700 9.5px/1 var(--m-mono)", color: "#f87171", marginBottom: 6 }}>TOUGHER OPPOSITIONS</div>
                <div className="mpd-grid-2">
                  {oppSplits.difficult.map((o) => (
                    <Link
                      key={o.team}
                      href={teamHrefFor(o.team)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid var(--mpd-line-soft)",
                        textDecoration: "none",
                        color: "var(--m-text)",
                      }}
                    >
                      <div style={{ font: "800 11.5px/1 var(--m-mono)", color: teamColor(o.team) }}>
                        {teamShort(o.team)} · {o.matches}m
                      </div>
                      <div style={{ font: "700 11px/1.3 var(--m-mono)", color: "var(--m-muted)", marginTop: 4 }}>
                        {isBowler ? `${o.wickets}W · ${o.econ.toFixed(2)}ec` : `${o.runs}r · ${o.sr.toFixed(0)} SR`}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
      </div>
      )}

      {/* 9D. Performance Evidence */}
      {intelTab === "evidence" && (
      <div className="mpd-intel-card">
        <div className="mpd-intel-body" style={{ borderTop: 0, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <Shield size={16} style={{ color: "#38bdf8" }} />
            <div>
              <div style={{ font: "800 13.5px/1.15 var(--m-display)" }}>Performance Evidence</div>
              <div style={{ font: "600 10.5px/1.25 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                Deterministic metric-backed readouts ({evidenceBullets.length})
              </div>
            </div>
          </div>
          {evidenceBullets.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 7, fontSize: 12.5, lineHeight: 1.45, color: "var(--m-text)" }}>
              {evidenceBullets.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>
              Not enough qualifying records for evidence readouts.
            </p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

export function HeadToHeadMobileSection({ data }: { data: MobilePlayerData }) {
  const { bio, displayName, isBowler, teamAccent, playerImages, formatPlayerName, matchAgg, recentMatches } = data;
  const bios = usePlayerBios();
  const topBatters = useTopBatters();
  const topBowlers = useTopBowlers();
  const [h2hMode, setH2hMode] = useState<"opponent" | "team">("opponent");
  const [search, setSearch] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState("");
  const [selectedTeamOpp, setSelectedTeamOpp] = useState("");

  const realOpponentsQuery = useQuery<Array<{ opponent: string; balls: number; runs: number; dismissals: number; strikeRate: number }>>({
    queryKey: ["mobile-player-h2h-opps", bio?.playerName, isBowler ? "bowler" : "batter"],
    enabled: Boolean(bio?.playerName),
    staleTime: 1000 * 60 * 30,
    retry: false,
    queryFn: async () => {
      const p = new URLSearchParams({ player: bio!.playerName, role: isBowler ? "bowler" : "batter" });
      const res = await fetch(`/api/ipl/matchup-opponents?${p}`);
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/json")) throw new Error("API unavailable");
      return res.json();
    },
  });

  const opponentPool = useMemo(() => {
    const apiList = realOpponentsQuery.data ?? [];
    if (apiList.length > 0) {
      return apiList.map((o) => ({ player: o.opponent, balls: o.balls, dismissals: o.dismissals }));
    }
    const fallbackArr = isBowler ? topBatters.data?.runs ?? [] : topBowlers.data?.wickets ?? [];
    return fallbackArr
      .filter((r) => !isSamePlayerName(r.player, bio?.playerName ?? ""))
      .map((r) => ({ player: r.player, balls: 0, dismissals: 0 }));
  }, [realOpponentsQuery.data, isBowler, topBatters.data, topBowlers.data, bio?.playerName]);

  const activeOpp = selectedOpp && opponentPool.some((o) => o.player === selectedOpp)
    ? selectedOpp
    : opponentPool[0]?.player ?? "";

  const filteredOpps = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return opponentPool;
    return opponentPool.filter(
      (o) =>
        o.player.toLowerCase().includes(q) ||
        formatPlayerName(o.player).toLowerCase().includes(q),
    );
  }, [opponentPool, search, formatPlayerName]);

  const duelBatter = bio ? (isBowler ? activeOpp : bio.playerName) : "";
  const duelBowler = bio ? (isBowler ? bio.playerName : activeOpp) : "";

  const apiMatchup = useQuery<any | null>({
    queryKey: ["mobile-player-h2h-duel", duelBatter, duelBowler],
    enabled: h2hMode === "opponent" && Boolean(duelBatter && duelBowler),
    staleTime: 1000 * 60 * 10,
    retry: false,
    queryFn: async () => {
      const p = new URLSearchParams({
        batter: resolveScorecardName(duelBatter, bios.data),
        bowler: resolveScorecardName(duelBowler, bios.data),
      });
      try {
        const res = await fetch(`/api/stats/matchup?${p}`);
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("application/json")) return null;
        return res.json();
      } catch {
        return null;
      }
    },
  });

  const recordedDeliveries = useRecordedDeliveries(h2hMode === "opponent" ? duelBatter : "");
  const clientFallback = useMemo(() => {
    if (h2hMode !== "opponent" || !duelBatter || !duelBowler) return null;
    return buildClientMatchupSummary(recordedDeliveries.data, duelBatter, duelBowler, bios.data);
  }, [h2hMode, recordedDeliveries.data, duelBatter, duelBowler, bios.data]);

  const matchupStats = useMemo(() => {
    const api = apiMatchup.data;
    if (api && Number(api.balls || 0) > 0) return api;
    if (clientFallback && clientFallback.balls > 0) return clientFallback;
    return api ?? clientFallback;
  }, [apiMatchup.data, clientFallback]);

  const activeTeamName = selectedTeamOpp || matchAgg.oppositions[0]?.team || "";
  const teamSummary = matchAgg.oppositions.find((o) => o.team === activeTeamName);
  const teamGames = useMemo(
    () => recentMatches.filter((m) => m.vsTeam === activeTeamName).slice(0, 4),
    [recentMatches, activeTeamName],
  );

  if (!bio) return null;

  return (
    <div className="mpd-sec">
      <div className="mpd-sec-head">
        <div>
          <span className="mpd-kicker">Matchups</span>
          <h2 className="mpd-title">Head to Head</h2>
        </div>
        <div className="mpd-subpills">
          <button
            type="button"
            className="mpd-subpill"
            data-active={h2hMode === "opponent"}
            onClick={() => setH2hMode("opponent")}
          >
            {isBowler ? "vs Batter" : "vs Bowler"}
          </button>
          <button
            type="button"
            className="mpd-subpill"
            data-active={h2hMode === "team"}
            onClick={() => setH2hMode("team")}
          >
            vs Team
          </button>
        </div>
      </div>

      {h2hMode === "opponent" ? (
        <div className="mpd-card">
          {/* Search + Select Dropdown */}
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 11, top: 12, color: "var(--m-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              value={search}
              placeholder={isBowler ? "Search opponent batter..." : "Search opponent bowler..."}
              onFocus={() => setDropOpen(true)}
              onBlur={() => setTimeout(() => setDropOpen(false), 160)}
              onChange={(e) => {
                const v = e.target.value;
                setSearch(v);
                setDropOpen(true);
                const q = normalizePlayerName(v);
                if (q) {
                  const hits = opponentPool.filter(
                    (o) => normalizePlayerName(o.player).includes(q) || normalizePlayerName(formatPlayerName(o.player)).includes(q),
                  );
                  if (hits.length === 1) setSelectedOpp(hits[0].player);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredOpps.length > 0) {
                  setSelectedOpp(filteredOpps[0].player);
                  setDropOpen(false);
                }
              }}
              style={{
                width: "100%",
                height: 38,
                padding: "0 32px 0 32px",
                borderRadius: 11,
                border: "1px solid var(--mpd-line)",
                background: "rgba(255,255,255,0.03)",
                color: "var(--m-text)",
                font: "600 12.5px/1 var(--m-ui)",
              }}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear opponent search"
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 10, top: 10, background: "transparent", border: 0, color: "var(--m-muted)" }}
              >
                <X size={14} />
              </button>
            )}
            {dropOpen && filteredOpps.length > 0 && (
              <div className="mpd-dropdown">
                {filteredOpps.slice(0, 35).map((opp) => (
                  <button
                    key={opp.player}
                    type="button"
                    data-active={opp.player === activeOpp}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedOpp(opp.player);
                      setDropOpen(false);
                    }}
                  >
                    <PlayerAvatar name={opp.player} playerImages={playerImages} className="w-6 h-6 shrink-0" />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {formatPlayerName(opp.player)}
                    </span>
                    {opp.balls > 0 && (
                      <span style={{ font: "600 10px/1 var(--m-mono)", color: "#94a3b8" }}>
                        {opp.balls}b · {opp.dismissals}w
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            aria-label="Select opponent"
            value={activeOpp}
            onChange={(e) => setSelectedOpp(e.target.value)}
            className="ms3-select"
            style={{
              width: "100%",
              height: 38,
              borderRadius: 10,
              border: "1px solid var(--mpd-line)",
              background: "rgba(8, 13, 28, 0.9)",
              color: "#f8fafc",
              padding: "0 10px",
              font: "600 12px/1 var(--m-ui)",
            }}
          >
            {filteredOpps.slice(0, 80).map((opp) => (
              <option key={opp.player} value={opp.player}>
                {formatPlayerName(opp.player)}{opp.balls > 0 ? ` (${opp.balls}b, ${opp.dismissals}w)` : ""}
              </option>
            ))}
          </select>

          {activeOpp && (
            <>
              {apiMatchup.isLoading && !clientFallback ? (
                <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>Loading duel telemetry…</p>
              ) : matchupStats && Number(matchupStats.balls || 0) > 0 ? (
                <>
                  <div className="mpd-grid-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                    {[
                      ["Runs", matchupStats.runs],
                      ["Balls", matchupStats.balls],
                      ["SR", Number(matchupStats.sr ?? 0).toFixed(1)],
                      ["Outs", matchupStats.dismissals ?? 0],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="mpd-kpi" style={{ textAlign: "center" }}>
                        <div className="mpd-kpi-k">{k}</div>
                        <div className="mpd-kpi-v" style={{ fontSize: 14 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {matchupStats.phaseSplit && (
                    <div className="mpd-grid-3">
                      {(
                        [
                          ["powerplay", "Powerplay"],
                          ["middle", "Middle"],
                          ["death", "Death"],
                        ] as const
                      ).map(([k, lbl]) => {
                        const ps = matchupStats.phaseSplit[k];
                        return (
                          <div key={k} className="mpd-kpi">
                            <div className="mpd-kpi-k">{lbl}</div>
                            <div className="mpd-kpi-v" style={{ fontSize: 13 }}>
                              {ps?.balls > 0 ? `${ps.runs} (${ps.balls}b)` : "—"}
                            </div>
                            <div style={{ font: "600 10px/1.2 var(--m-mono)", color: teamAccent, marginTop: 2 }}>
                              {ps?.balls > 0 ? `SR ${ps.sr}` : "0 balls"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Primary scoring-area visualization (reuses HeadToHeadGroundVisual, no duplicate ScoringRing) */}
                  <div className="stats-tool" style={{ maxWidth: "100%", overflow: "hidden" }}>
                    <HeadToHeadGroundVisual
                      batterName={formatPlayerName(duelBatter)}
                      bowlerName={formatPlayerName(duelBowler)}
                      matchupData={matchupStats}
                    />
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>
                  No recorded deliveries between {displayName} and {formatPlayerName(activeOpp)}.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mpd-card">
          <select
            aria-label="Select opponent franchise"
            value={activeTeamName}
            onChange={(e) => setSelectedTeamOpp(e.target.value)}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 10,
              border: "1px solid var(--mpd-line)",
              background: "rgba(8, 13, 28, 0.9)",
              color: "#f8fafc",
              padding: "0 10px",
              font: "600 12px/1 var(--m-ui)",
            }}
          >
            {matchAgg.oppositions.map((o) => (
              <option key={o.team} value={o.team}>
                vs {o.team} ({o.matches}m)
              </option>
            ))}
          </select>

          {teamSummary ? (
            <>
              <div className="mpd-grid-3">
                <div className="mpd-kpi">
                  <div className="mpd-kpi-k">Matches</div>
                  <div className="mpd-kpi-v">{teamSummary.matches}</div>
                </div>
                <div className="mpd-kpi">
                  <div className="mpd-kpi-k">Win Rate</div>
                  <div className="mpd-kpi-v">{teamSummary.winPct}%</div>
                </div>
                <div className="mpd-kpi">
                  <div className="mpd-kpi-k">{isBowler ? "Wickets / Econ" : "Runs / SR"}</div>
                  <div className="mpd-kpi-v" style={{ fontSize: 13 }}>
                    {isBowler ? `${teamSummary.wickets} / ${teamSummary.econ.toFixed(2)}` : `${teamSummary.runs} / ${teamSummary.sr.toFixed(0)}`}
                  </div>
                </div>
              </div>

              {teamGames.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {teamGames.map((m) => (
                    <Link
                      key={m.matchId}
                      href={`/match/${m.matchId}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--mpd-line-soft)",
                        textDecoration: "none",
                        color: "var(--m-text)",
                        fontSize: 12,
                      }}
                    >
                      <span>{String(m.date).slice(0, 10)} · {m.result}</span>
                      <span style={{ font: "700 11px/1 var(--m-mono)", color: teamAccent }}>
                        {m.batting ? `${m.batting.runs} (${m.batting.balls}b)` : m.bowling ? `${m.bowling.wickets}/${m.bowling.runs}` : "View"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>No opponent team history recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function RecentAndReportsSection({
  data,
  fixedMode,
}: {
  data: MobilePlayerData;
  fixedMode?: "history" | "reports";
}) {
  const { bio, recentMatches, playerArticles, teamAccent, displayName } = data;
  const [innerTab, setInnerTab] = useState<"history" | "reports">("history");
  const tab = fixedMode ?? innerTab;
  const [showAllMatches, setShowAllMatches] = useState(false);

  const visibleMatches = showAllMatches ? recentMatches : recentMatches.slice(0, 6);
  const featured = playerArticles[0];
  const restArticles = playerArticles.slice(1);

  if (!bio) return null;

  return (
    <div className="mpd-sec">
      <div className="mpd-sec-head">
        <div>
          <span className="mpd-kicker">
            {tab === "reports" ? "Editorial Dossier Archive" : "Official Match Log"}
          </span>
          <h2 className="mpd-title">
            {fixedMode === "history"
              ? `Match History (${recentMatches.length})`
              : fixedMode === "reports"
                ? `Intelligence Reports (${playerArticles.length})`
                : "Recent Form & Reports"}
          </h2>
        </div>
      </div>

      {!fixedMode && (
        <div className="mpd-subpills" role="tablist" aria-label="Recent form and reports switcher">
          <button
            type="button"
            className="mpd-subpill"
            data-active={tab === "history"}
            onClick={() => setInnerTab("history")}
          >
            Match History ({recentMatches.length})
          </button>
          <button
            type="button"
            className="mpd-subpill"
            data-active={tab === "reports"}
            onClick={() => setInnerTab("reports")}
          >
            Intelligence Reports ({playerArticles.length})
          </button>
        </div>
      )}

      {tab === "history" ? (
        <div className="mpd-card">
          {visibleMatches.length > 0 ? (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                {visibleMatches.map((m) => {
                  const won = m.result === "Won";
                  const lost = m.result === "Lost";
                  return (
                    <Link
                      key={m.matchId}
                      href={`/match/${m.matchId}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 11px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid var(--mpd-line-soft)",
                        textDecoration: "none",
                        color: "var(--m-text)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <TeamLogo team={m.vsTeam || "IPL"} size="w-7 h-7" />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ font: "700 12.5px/1.2 var(--m-ui)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            vs {m.vsTeam}
                          </div>
                          <div style={{ font: "500 10.5px/1.25 var(--m-mono)", color: "var(--m-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {String(m.date || "").slice(0, 10)} · {String(m.venue || "").split(",")[0]}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ font: "800 12.5px/1.1 var(--m-mono)" }}>
                          {m.batting
                            ? `${m.batting.runs}${m.batting.notOut ? "*" : ""} (${m.batting.balls})`
                            : m.bowling
                              ? `${m.bowling.wickets}/${m.bowling.runs}`
                              : "Played"}
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            padding: "2px 7px",
                            borderRadius: 999,
                            font: "700 9px/1 var(--m-mono)",
                            background: won ? "rgba(52,211,153,0.16)" : lost ? "rgba(248,113,113,0.16)" : "rgba(255,255,255,0.08)",
                            color: won ? "#34d399" : lost ? "#f87171" : "#94a3b8",
                          }}
                        >
                          {m.result || "NR"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {recentMatches.length > 6 && (
                <button type="button" className="mpd-btn" onClick={() => setShowAllMatches((v) => !v)}>
                  {showAllMatches ? "Show recent 6" : `View Full History (${recentMatches.length})`}
                </button>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--m-muted)" }}>
              No match history available for this player.
            </p>
          )}
        </div>
      ) : (
        <div className="mpd-card">
          {featured ? (
            <>
              <Link
                href={`/dugout/articles/${featured.slug}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 13,
                  borderRadius: 14,
                  background: `radial-gradient(100% 90% at 100% 0%, ${teamAccent}25, transparent 65%), rgba(255,255,255,0.03)`,
                  border: `1px solid ${teamAccent}55`,
                  textDecoration: "none",
                  color: "var(--m-text)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ font: "800 9.5px/1 var(--m-mono)", color: teamAccent, textTransform: "uppercase" }}>
                    FEATURED · {STORY_TYPE_LABEL[featured.storyType ?? ""] ?? "INTELLIGENCE"}
                  </span>
                  <span style={{ font: "600 10px/1 var(--m-mono)", color: "var(--m-muted)" }}>
                    {featured.readMinutes} min · {featured.publishedDate}
                  </span>
                </div>
                <h3 style={{ margin: 0, font: "800 15px/1.25 var(--m-display)" }}>{featured.title}</h3>
                {featured.dek && (
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: "var(--m-muted)" }}>{featured.dek}</p>
                )}
                {featured.headlineStat && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 9px", borderRadius: 9, background: "rgba(255,255,255,0.04)", fontSize: 11 }}>
                    <span style={{ color: "var(--m-muted)" }}>{featured.headlineStat.label}</span>
                    <strong style={{ fontFamily: "var(--m-mono)", color: teamAccent }}>{featured.headlineStat.display}</strong>
                  </div>
                )}
              </Link>

              {restArticles.map((art) => (
                <Link
                  key={art.id}
                  href={`/dugout/articles/${art.slug}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "10px 0",
                    borderTop: "1px solid var(--mpd-line-soft)",
                    textDecoration: "none",
                    color: "var(--m-text)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", font: "700 9.5px/1 var(--m-mono)", color: "var(--m-muted)" }}>
                    <span>{STORY_TYPE_LABEL[art.storyType ?? ""] ?? "REPORT"}</span>
                    <span>{art.readMinutes}m · {art.publishedDate}</span>
                  </div>
                  <strong style={{ font: "700 13px/1.3 var(--m-display)" }}>{art.title}</strong>
                </Link>
              ))}

              <Link href={`/intelligence?q=${encodeURIComponent(displayName)}`} className="mpd-btn">
                <Newspaper size={14} /> Open Editorial Archive <ArrowUpRight size={13} />
              </Link>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--m-muted)" }}>
              No Intelligence Reports published yet for this player.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function UtilityAndProvenanceFooter({ data }: { data: MobilePlayerData }) {
  const { bio } = data;
  if (!bio) return null;

  return (
    <>
      <div className="mpd-sec" style={{ flexDirection: "row", gap: 10 }}>
        <Link href="/pressurelab/compare" className="mpd-btn" style={{ flex: 1 }}>
          <Scale size={14} /> Compare
        </Link>
        <Link href={`/pressurelab?q=${encodeURIComponent(bio.playerName)}`} className="mpd-btn" style={{ flex: 1 }}>
          <Crosshair size={14} /> Scout Report
        </Link>
      </div>
      <p className="cfm-provenance" style={{ marginTop: 14 }}>
        IPL career, phase, season and ball-by-ball metrics: CRICFIELD warehouse (Cricsheet dataset). Biography and editorial archives use verified site manifests; missing fields stay unpopulated rather than estimated.
      </p>
    </>
  );
}
