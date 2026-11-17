import React, { useState } from "react";
import { Link } from "wouter";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gavel,
  History,
  Newspaper,
  Radio,
  Sparkles,
  Wallet,
} from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { HUB_EVENTS } from "@/lib/ipl-2027";
import { playerSlug } from "@/lib/aggregates";
import { pulseMoney, type PulseModel, type PulseTab } from "@/lib/pulse-auction";
import {
  FAN_PULSE_QUESTIONS,
  roleBand,
  spendText,
  teamCardStyle,
  teamHex,
  unsoldText,
  type PulseHookResult,
} from "@/lib/pulse-helpers";
import { MobileFeedBadge, MobileNewsroomLinks } from "./shared";

export function MobileOverviewTab({
  model,
  pulse,
  phase,
  go,
}: {
  model: PulseModel;
  pulse: PulseHookResult;
  phase: string;
  go: (t: PulseTab) => void;
}) {
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>(
    () => model.teams[0]?.code ?? "RCB",
  );
  const [pollIdx, setPollIdx] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});

  const remPurseTotal = model.teams.reduce((acc, t) => acc + (t.remaining ?? 0), 0);
  const totalRetained = model.teams.reduce((acc, t) => acc + (t.retained ?? 0), 0);
  const topLot = model.ranked[0] ?? null;

  const activeTeam =
    model.teams.find((t) => t.code === selectedTeamCode) ?? model.teams[0] ?? null;
  const activePct =
    activeTeam && activeTeam.startingPurse && activeTeam.spent != null
      ? Math.min(100, Math.round((activeTeam.spent / activeTeam.startingPurse) * 100))
      : 0;

  const currentQ = FAN_PULSE_QUESTIONS[pollIdx];
  const votedOption = votes[currentQ.id];
  const latestAnnouncement = pulse.desk.data?.announcements?.[0] ?? null;

  return (
    <div className="space-y-3" data-testid="pulse-tab-overview">
      {/* 1. Compact Auction Snapshot */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Radio className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>IPL {model.season} Snapshot</span>
          </h2>
          <span className="mp-card-sub">{phase}</span>
        </div>

        <MobileFeedBadge active={model.season} pulse={pulse} />

        <div className="mp-kpi-grid">
          <div className="mp-kpi">
            <div className="mp-kpi-label">Players Sold</div>
            <div className="mp-kpi-val" style={{ color: "var(--mp-ok)" }}>
              {model.sold}
            </div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Unsold</div>
            <div className="mp-kpi-val" style={{ color: "var(--mp-bad)" }}>
              {unsoldText(model)}
            </div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Total Expenditure</div>
            <div className="mp-kpi-val" style={{ color: "var(--mp-amber)" }}>
              {spendText(model)}
            </div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Remaining Purse</div>
            <div className="mp-kpi-val" style={{ color: "var(--mp-purple)" }}>
              {remPurseTotal > 0 ? pulseMoney(remPurseTotal) : "Cap Exhausted"}
            </div>
          </div>
        </div>

        {topLot && (
          <Link
            href={`/players/${playerSlug(topLot.player)}`}
            className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg border"
            style={teamCardStyle(topLot.team)}
          >
            <div className="flex items-center gap-2 min-w-0">
              {topLot.team && <TeamLogo team={topLot.team} size="w-6 h-6 shrink-0" />}
              <div className="min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-emerald-400">
                  Top Hammer · {topLot.team ?? "IPL"}
                </div>
                <div className="text-xs font-extrabold truncate">{topLot.player}</div>
              </div>
            </div>
            <span className="font-mono font-black text-xs text-emerald-400 shrink-0">
              {pulseMoney(topLot.price, topLot.usd)}
            </span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowAllMetrics((v) => !v)}
          className="mp-row-btn justify-between py-1 text-[11px]"
          aria-expanded={showAllMetrics}
        >
          <span className="font-semibold" style={{ color: "var(--mp-muted)" }}>
            {showAllMetrics ? "Hide extended metrics & schedule" : "More metrics & event schedule"}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAllMetrics ? "rotate-180" : ""}`}
            style={{ color: "var(--mp-muted)" }}
          />
        </button>

        {showAllMetrics && (
          <div className="space-y-2.5 pt-1 border-t border-white/10">
            <div className="mp-kpi-grid">
              <div className="mp-kpi">
                <div className="mp-kpi-label">Auction Pool</div>
                <div className="mp-kpi-val">{model.rows.length} Lots</div>
              </div>
              <div className="mp-kpi">
                <div className="mp-kpi-label">Retained Core</div>
                <div className="mp-kpi-val" style={{ color: "var(--mp-cyan)" }}>
                  {totalRetained} Players
                </div>
              </div>
              <div className="mp-kpi">
                <div className="mp-kpi-label">Franchises</div>
                <div className="mp-kpi-val">{model.teams.length} Teams</div>
              </div>
              <div className="mp-kpi">
                <div className="mp-kpi-label">Top Hammer Price</div>
                <div className="mp-kpi-val" style={{ color: "var(--mp-ok)" }}>
                  {topLot ? pulseMoney(topLot.price, topLot.usd) : "—"}
                </div>
              </div>
            </div>

            {model.season === 2027 ? (
              <ol className="space-y-1.5 text-[11px]">
                {HUB_EVENTS.map((ev) => (
                  <li key={ev.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[10px]" style={{ color: "var(--mp-muted)" }}>
                      {ev.date ?? "TBA"}
                    </span>
                    <span className="font-bold">{ev.title}</span>
                    <span className="text-[9.5px] font-mono uppercase text-amber-400">
                      {ev.status === "provisional" ? "TBA" : ev.status}
                    </span>
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px]"
                        style={{ color: "var(--mp-accent)" }}
                      >
                        source <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-[11px] space-y-0.5" style={{ color: "var(--mp-muted)" }}>
                <div>Venue: {model.foundation?.venue ?? "Etihad Arena, Abu Dhabi"}</div>
                <div>
                  Date: {model.foundation?.eventDate ?? "Dec 16, 2025"} · Squad Limit: 25 players / 8 overseas
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Franchise Purse Index */}
      {model.teams.length > 0 && (
        <section className="mp-card">
          <div className="mp-card-head">
            <h2 className="mp-card-title">
              <Wallet className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Franchise Purse Index</span>
            </h2>
            <button
              type="button"
              onClick={() => go("Franchises")}
              className="mp-text-link"
            >
              <span>All Teams</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mp-hscroll" role="tablist" aria-label="Select franchise purse">
            {model.teams.map((t) => {
              const on = activeTeam?.code === t.code;
              const hex = teamHex(t.code);
              return (
                <button
                  key={t.code}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  data-active={on ? "true" : "false"}
                  onClick={() => setSelectedTeamCode(t.code)}
                  className="mp-team-chip"
                  style={on ? { borderColor: hex, boxShadow: `0 0 0 1px ${hex}44` } : undefined}
                >
                  <TeamLogo team={t.code} size="w-4 h-4 shrink-0" />
                  <span>{t.code}</span>
                </button>
              );
            })}
          </div>

          {activeTeam && (
            <div
              className="rounded-lg border p-3 space-y-2.5"
              style={teamCardStyle(activeTeam.code)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TeamLogo team={activeTeam.code} size="w-7 h-7 shrink-0" />
                  <div className="min-w-0">
                    <div
                      className="text-sm font-black tracking-tight"
                      style={{ color: teamHex(activeTeam.code) }}
                    >
                      {activeTeam.code}
                    </div>
                    <div className="text-[10.5px] font-mono" style={{ color: "var(--mp-muted)" }}>
                      {activeTeam.purchases.length} bought ·{" "}
                      {activeTeam.slots ?? Math.max(0, 25 - (activeTeam.squad ?? 0))} slots open
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9.5px] font-mono uppercase" style={{ color: "var(--mp-muted)" }}>
                    Remaining
                  </div>
                  <div className="font-mono font-black text-sm text-emerald-400">
                    {activeTeam.remaining == null
                      ? "Unverified"
                      : pulseMoney(activeTeam.remaining)}
                  </div>
                </div>
              </div>

              <div className="mp-progress-track">
                <div
                  className="mp-progress-fill"
                  style={{
                    width: `${activePct}%`,
                    background: teamHex(activeTeam.code),
                  }}
                />
              </div>

              <div
                className="flex items-center justify-between text-[11px] font-mono"
                style={{ color: "var(--mp-muted)" }}
              >
                <span>
                  Spent: {activeTeam.purchases.length ? `${spendText(activeTeam)} (${activePct}%)` : "No buys"}
                </span>
                <span>
                  Squad: {activeTeam.squad ?? "—"} · OS: {activeTeam.overseas ?? "—"}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. Top Hammer Purchases Preview */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Gavel className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Top Hammer Purchases</span>
          </h2>
          <button type="button" onClick={() => go("Results")} className="mp-text-link">
            <span>Full Results</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {model.ranked.length ? (
          <div className="mp-list-divider">
            {model.ranked.slice(0, 5).map((lot, idx) => (
              <Link
                key={lot.id}
                href={`/players/${playerSlug(lot.player)}`}
                className="flex items-center gap-2.5 py-2"
              >
                <span
                  className="w-5 font-mono text-[11px] font-black text-center shrink-0"
                  style={{ color: "var(--mp-muted)" }}
                >
                  #{idx + 1}
                </span>
                {lot.team && <TeamLogo team={lot.team} size="w-5 h-5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{lot.player}</div>
                  <div className="text-[10px]" style={{ color: "var(--mp-muted)" }}>
                    {roleBand(lot.role)} {lot.team ? `· ${lot.team}` : ""}
                  </div>
                </div>
                <span className="font-mono font-black text-xs text-emerald-400 shrink-0">
                  {pulseMoney(lot.price, lot.usd)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-xs" style={{ color: "var(--mp-muted)" }}>
            No confirmed hammer sales recorded for IPL {model.season} yet.
          </div>
        )}
      </section>

      {/* 4. Interactive Fan Pulse Poll */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Fan Pulse</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10"
              style={{ color: "var(--mp-muted)" }}
            >
              {pollIdx + 1}/{FAN_PULSE_QUESTIONS.length}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setPollIdx((p) => (p === 0 ? FAN_PULSE_QUESTIONS.length - 1 : p - 1))
              }
              aria-label="Previous Fan Pulse question"
              className="mp-icon-btn w-8 h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPollIdx((p) => (p + 1) % FAN_PULSE_QUESTIONS.length)}
              aria-label="Next Fan Pulse question"
              className="mp-icon-btn w-8 h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div
            className="text-[10px] font-mono uppercase font-bold tracking-wider"
            style={{ color: "var(--mp-accent)" }}
          >
            {currentQ.kicker}
          </div>
          <h3 className="text-[13px] font-bold leading-snug m-0">{currentQ.question}</h3>

          <div className="space-y-1.5 pt-1">
            {currentQ.options.map((opt) => {
              const isChosen = votedOption === opt.id;
              const pct = isChosen ? Math.min(99, opt.pct + 1) : opt.pct;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVotes((prev) => ({ ...prev, [currentQ.id]: opt.id }))}
                  className="w-full relative overflow-hidden text-left px-3 py-2.5 rounded-lg border transition-colors"
                  style={{
                    borderColor: isChosen ? "var(--mp-accent)" : "var(--mp-border)",
                    background: "var(--mp-surface-muted)",
                    color: "var(--mp-text)",
                    font: "600 11.5px/1.25 var(--m-ui)",
                  }}
                >
                  {votedOption && (
                    <span
                      className="absolute inset-y-0 left-0 pointer-events-none"
                      style={{
                        width: `${pct}%`,
                        background: "var(--mp-accent-soft)",
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-between gap-2">
                    <span>{opt.label}</span>
                    {votedOption && (
                      <span
                        className="font-mono font-black text-[11px] shrink-0"
                        style={{ color: "var(--mp-accent)" }}
                      >
                        {pct}%
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            {FAN_PULSE_QUESTIONS.map((q, idx) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setPollIdx(idx)}
                aria-label={`Poll question ${idx + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: pollIdx === idx ? 18 : 6,
                  background: pollIdx === idx ? "var(--mp-accent)" : "var(--mp-border-strong)",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Coverage & Newsroom Teaser */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Newspaper className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Coverage & Insights</span>
          </h2>
          <button type="button" onClick={() => go("Live Blog")} className="mp-text-link">
            <span>Live Blog</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestAnnouncement ? (
          <div className="p-2.5 rounded-lg border border-white/10 bg-white/[0.025] space-y-1">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className="uppercase font-extrabold text-cyan-400">
                {latestAnnouncement.verification}
              </span>
              {latestAnnouncement.team && (
                <span style={{ color: teamHex(latestAnnouncement.team) }}>
                  {latestAnnouncement.team}
                </span>
              )}
            </div>
            <div className="text-xs font-bold leading-snug">{latestAnnouncement.headline}</div>
          </div>
        ) : (
          <div className="text-xs" style={{ color: "var(--mp-muted)" }}>
            Follow live updates in the Coverage tab or switch seasons via the top selector or{" "}
            <button
              type="button"
              onClick={() => go("Archive")}
              className="underline font-semibold"
              style={{ color: "var(--mp-accent)" }}
            >
              Archive
            </button>
            .
          </div>
        )}

        <MobileNewsroomLinks />
      </section>
    </div>
  );
}
