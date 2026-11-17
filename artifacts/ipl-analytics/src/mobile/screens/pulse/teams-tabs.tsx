import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Brain,
  ChevronDown,
  ExternalLink,
  Gavel,
  Search,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { playerSlug } from "@/lib/aggregates";
import { isTeamCode } from "@/lib/team-context";
import { pulseMoney, type PulseModel, type PulseTeam } from "@/lib/pulse-auction";
import {
  roleBand,
  spendText,
  teamCardStyle,
  teamHex,
  unsoldText,
  type PulseHookResult,
} from "@/lib/pulse-helpers";
import { MobileInsightBox, MobileSourcesBar } from "./shared";

/* Shared Franchise Dossier Body (used in Franchises & expandable Results rows) */
function FranchiseDetailBody({ t, model }: { t: PulseTeam; model: PulseModel }) {
  const [section, setSection] = useState<"buys" | "retained" | "links">("buys");
  const needs =
    t.slots != null && t.slots > 0
      ? `${t.slots} slot${t.slots === 1 ? "" : "s"} open`
      : t.slots === 0
        ? "Squad full"
        : null;

  return (
    <div className="space-y-2.5">
      {/* Segmented pill toggle inside franchise card */}
      <div className="mp-hscroll">
        <button
          type="button"
          onClick={() => setSection("buys")}
          data-active={section === "buys" ? "true" : "false"}
          className="mp-filter-pill"
        >
          Bought ({t.purchases.length})
        </button>
        <button
          type="button"
          onClick={() => setSection("retained")}
          data-active={section === "retained" ? "true" : "false"}
          className="mp-filter-pill"
        >
          Retained ({t.retained ?? t.core.length})
        </button>
        {isTeamCode(t.code) && (
          <button
            type="button"
            onClick={() => setSection("links")}
            data-active={section === "links" ? "true" : "false"}
            className="mp-filter-pill"
          >
            Dugout & Analyst
          </button>
        )}
      </div>

      {section === "buys" && (
        <div className="space-y-1">
          {t.purchases.length > 0 ? (
            <div className="mp-list-divider">
              {[...t.purchases]
                .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
                .map((p) => (
                  <Link
                    key={p.id}
                    href={`/players/${playerSlug(p.player)}`}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{p.player}</div>
                      <div className="text-[10px]" style={{ color: "var(--mp-muted)" }}>
                        {roleBand(p.role)}
                      </div>
                    </div>
                    <span className="font-mono font-black text-emerald-400 shrink-0">
                      {pulseMoney(p.price, p.usd)}
                    </span>
                  </Link>
                ))}
            </div>
          ) : (
            <div className="text-xs py-2" style={{ color: "var(--mp-muted)" }}>
              No auction purchases recorded for {t.code}.
            </div>
          )}
        </div>
      )}

      {section === "retained" && (
        <div className="space-y-2 text-xs">
          {t.core.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {t.core.map((p, idx) => (
                <Link
                  key={`${p.name}-${idx}`}
                  href={`/players/${playerSlug(p.name)}`}
                  className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold hover:underline"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--mp-muted)" }}>No retention list recorded.</div>
          )}
          {needs && (
            <div className="text-[11px] font-medium text-amber-300">
              Recruitment: {needs}
              {t.overseas != null && model.foundation
                ? `, ${Math.max(0, model.foundation.maxOverseas - t.overseas)} overseas`
                : ""}
              .
            </div>
          )}
        </div>
      )}

      {section === "links" && isTeamCode(t.code) && (
        <div className="grid grid-cols-2 gap-1.5">
          {[
            [`${t.code} Dugout`, `/dugout/${t.code}`],
            ["Squad DNA", `/ai-analyst/squad-dna?team=${t.code}&season=${model.season}`],
            ["Auction War Room", `/ai-analyst/auction-war-room?team=${t.code}`],
            ["Opposition Map", `/ai-analyst/opposition-map?team=${t.code}`],
            ["Retention Room", `/feed/squad?team=${t.code}`],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="px-2.5 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] font-bold text-center"
              style={{ color: "var(--mp-accent)" }}
            >
              {label} →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FRANCHISES TAB
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileFranchisesTab({ model }: { model: PulseModel }) {
  const [selectedCode, setSelectedCode] = useState<string>(
    () => model.teams[0]?.code ?? "RCB",
  );
  const team = model.teams.find((t) => t.code === selectedCode) ?? model.teams[0];

  if (!team) {
    return (
      <section className="mp-card text-xs" style={{ color: "var(--mp-muted)" }}>
        No franchise purse records available for IPL {model.season}.
      </section>
    );
  }

  const pct =
    team.startingPurse && team.spent != null
      ? Math.min(100, Math.round((team.spent / team.startingPurse) * 100))
      : 0;

  return (
    <div className="space-y-3" data-testid="pulse-tab-franchises">
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Wallet className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Franchise Auction Desk</span>
          </h2>
          <span className="mp-card-sub">{model.teams.length} teams</span>
        </div>

        {/* Horizontal Franchise Switcher */}
        <div className="mp-hscroll" role="tablist" aria-label="Select franchise">
          {model.teams.map((t) => {
            const active = t.code === team.code;
            const hex = teamHex(t.code);
            return (
              <button
                key={t.code}
                type="button"
                role="tab"
                aria-selected={active}
                data-active={active ? "true" : "false"}
                onClick={() => setSelectedCode(t.code)}
                className="mp-team-chip"
                style={active ? { borderColor: hex, boxShadow: `0 0 0 1px ${hex}44` } : undefined}
              >
                <TeamLogo team={t.code} size="w-4 h-4 shrink-0" />
                <span>{t.code}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Franchise Dossier Card */}
        <div className="rounded-xl border p-3 space-y-3" style={teamCardStyle(team.code)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamLogo team={team.code} size="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <div className="text-base font-black tracking-tight" style={{ color: teamHex(team.code) }}>
                  {team.code}
                </div>
                <div className="text-[10.5px] font-mono" style={{ color: "var(--mp-muted)" }}>
                  {model.foundation ? "Official Retention Purse" : `IPL ${model.season} Squad`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9.5px] font-mono uppercase" style={{ color: "var(--mp-muted)" }}>
                Remaining
              </div>
              <div className="font-mono font-black text-sm text-emerald-400">
                {team.remaining == null ? "Unverified" : pulseMoney(team.remaining)}
              </div>
            </div>
          </div>

          <div className="mp-progress-track">
            <div
              className="mp-progress-fill"
              style={{ width: `${pct}%`, background: teamHex(team.code) }}
            />
          </div>

          <div className="mp-kpi-grid-3">
            <div className="mp-kpi">
              <div className="mp-kpi-label">Start Purse</div>
              <div className="mp-kpi-val text-xs">
                {team.startingPurse == null ? "Unverified" : pulseMoney(team.startingPurse)}
              </div>
            </div>
            <div className="mp-kpi">
              <div className="mp-kpi-label">Spent ({pct}%)</div>
              <div className="mp-kpi-val text-xs" style={{ color: "var(--mp-amber)" }}>
                {team.purchases.length ? spendText(team) : "—"}
              </div>
            </div>
            <div className="mp-kpi">
              <div className="mp-kpi-label">Bought</div>
              <div className="mp-kpi-val text-xs">{team.purchases.length}</div>
            </div>
            <div className="mp-kpi">
              <div className="mp-kpi-label">Squad Size</div>
              <div className="mp-kpi-val text-xs">{team.squad ?? "—"}</div>
            </div>
            <div className="mp-kpi">
              <div className="mp-kpi-label">Overseas</div>
              <div className="mp-kpi-val text-xs" style={{ color: "var(--mp-cyan)" }}>
                {team.overseas == null
                  ? "—"
                  : `${team.overseas}${model.foundation ? `/${model.foundation.maxOverseas}` : ""}`}
              </div>
            </div>
            <div className="mp-kpi">
              <div className="mp-kpi-label">Slots Open</div>
              <div className="mp-kpi-val text-xs">{team.slots ?? "—"}</div>
            </div>
          </div>

          <FranchiseDetailBody key={team.code} t={team} model={model} />
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RETENTIONS TAB
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileRetentionsTab({
  model,
  pulse,
}: {
  model: PulseModel;
  pulse: PulseHookResult;
}) {
  const [openCode, setOpenCode] = useState<string | null>(() => model.teams[0]?.code ?? null);
  const desk = pulse.desk.data;
  const released = (code: string) =>
    model.historical
      ? []
      : (desk?.retentions ?? [])
          .filter((r) => r.team === code && r.decision === "released")
          .map((r) => r.player);

  return (
    <div className="space-y-3" data-testid="pulse-tab-retentions">
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Retentions · IPL {model.season}</span>
          </h2>
          <span className="mp-card-sub">
            {model.historical ? "Official core" : "Official release"}
          </span>
        </div>

        <div className="space-y-2">
          {model.teams.map((t) => {
            const isOpen = openCode === t.code;
            const rel = released(t.code);
            return (
              <div
                key={t.code}
                className="rounded-xl border overflow-hidden"
                style={teamCardStyle(t.code)}
              >
                <button
                  type="button"
                  onClick={() => setOpenCode(isOpen ? null : t.code)}
                  aria-expanded={isOpen}
                  className="mp-row-btn px-3 py-2.5"
                >
                  <TeamLogo team={t.code} size="w-6 h-6 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs" style={{ color: teamHex(t.code) }}>
                        {t.code}
                      </span>
                      <span className="text-[11px] font-mono" style={{ color: "var(--mp-muted)" }}>
                        {t.retained == null ? "Not announced" : `${t.retained} retained`}
                      </span>
                    </div>
                  </div>
                  {t.startingPurse != null && (
                    <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">
                      {pulseMoney(t.startingPurse)}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    style={{ color: "var(--mp-muted)" }}
                  />
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/10 space-y-2.5 text-xs">
                    <div>
                      <div className="text-[9.5px] font-mono uppercase font-bold text-emerald-400 mb-1">
                        Retained ({t.core.length})
                      </div>
                      {t.core.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {t.core.map((p, idx) => (
                            <Link
                              key={`${p.name}-${idx}`}
                              href={`/players/${playerSlug(p.name)}`}
                              className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold"
                            >
                              {p.name}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--mp-muted)" }}>Not announced</span>
                      )}
                    </div>

                    {rel.length > 0 && (
                      <div>
                        <div className="text-[9.5px] font-mono uppercase font-bold text-rose-400 mb-1">
                          Released ({rel.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rel.map((name, idx) => (
                            <Link
                              key={`${name}-${idx}`}
                              href={`/players/${playerSlug(name)}`}
                              className="px-2.5 py-1 rounded-full border border-rose-500/25 bg-rose-500/10 text-[11px]"
                            >
                              {name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {isTeamCode(t.code) && (
                      <Link
                        href={`/dugout/${t.code}`}
                        className="inline-block text-[11px] font-bold"
                        style={{ color: "var(--mp-accent)" }}
                      >
                        Open {t.code} Dugout →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10 text-[11px] font-semibold">
          <Link href="/feed/squad" style={{ color: "var(--mp-accent)" }}>
            Retention Room →
          </Link>
          <Link href="/feed/ipl-2027/retentions" style={{ color: "var(--mp-accent)" }}>
            Full 2027 List →
          </Link>
          {model.foundation?.sourceUrl && (
            <a
              href={model.foundation.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1"
              style={{ color: "var(--mp-accent)" }}
            >
              Official Source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESULTS TAB
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileResultsTab({ model }: { model: PulseModel }) {
  const [openPurchaseId, setOpenPurchaseId] = useState<string | null>(null);
  const [openTeamCode, setOpenTeamCode] = useState<string | null>(null);
  const [unsoldQuery, setUnsoldQuery] = useState("");
  const [cappedOnly, setCappedOnly] = useState(false);

  const unsoldAll = useMemo(
    () =>
      model.rows
        .filter((r) => r.status === "unsold")
        .sort((a, b) => (b.base ?? 0) - (a.base ?? 0)),
    [model.rows],
  );
  const filteredUnsold = useMemo(
    () =>
      unsoldAll.filter(
        (u) =>
          (!unsoldQuery || u.player.toLowerCase().includes(unsoldQuery.toLowerCase())) &&
          (!cappedOnly || u.capped === true),
      ),
    [unsoldAll, unsoldQuery, cappedOnly],
  );

  const maxSpend = Math.max(1, ...model.teams.map((t) => t.spent ?? t.spentUsd ?? 0));
  const topLot = model.ranked[0] ?? null;

  return (
    <div className="space-y-3" data-testid="pulse-tab-results">
      {/* 1. Summary KPIs */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Gavel className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>IPL {model.season} Results Summary</span>
          </h2>
        </div>

        <div className="mp-kpi-grid">
          <div className="mp-kpi">
            <div className="mp-kpi-label">Sold</div>
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
            <div className="mp-kpi-label">Total Spend</div>
            <div className="mp-kpi-val" style={{ color: "var(--mp-amber)" }}>
              {spendText(model)}
            </div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Top Purchase</div>
            <div className="mp-kpi-val" style={{ color: "var(--mp-ok)" }}>
              {topLot ? pulseMoney(topLot.price, topLot.usd) : "—"}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Biggest Purchases */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Gavel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Biggest Purchases</span>
          </h2>
          <span className="mp-card-sub">Top 12</span>
        </div>

        {model.ranked.length > 0 ? (
          <div className="mp-list-divider">
            {model.ranked.slice(0, 12).map((item, idx) => {
              const isOpen = openPurchaseId === item.id;
              return (
                <div key={item.id} className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 font-mono text-[10.5px] font-bold" style={{ color: "var(--mp-muted)" }}>
                      #{idx + 1}
                    </span>
                    {item.team && <TeamLogo team={item.team} size="w-5 h-5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/players/${playerSlug(item.player)}`}
                        className="block text-xs font-bold truncate"
                      >
                        {item.player}
                      </Link>
                      <div className="text-[10px]" style={{ color: "var(--mp-muted)" }}>
                        {roleBand(item.role)}
                        {item.team ? ` · ${item.team}` : ""}
                      </div>
                    </div>
                    <span className="font-mono font-black text-xs text-emerald-400 shrink-0">
                      {pulseMoney(item.price, item.usd)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenPurchaseId(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      aria-label={`Insight for ${item.player}`}
                      className="mp-icon-btn w-8 h-8"
                    >
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="mt-2">
                      <MobileInsightBox lot={item} model={model} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs" style={{ color: "var(--mp-muted)" }}>
            No confirmed purchases recorded.
          </div>
        )}
      </section>

      {/* 3. Spend by Franchise */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Wallet className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Spend by Franchise</span>
          </h2>
        </div>

        <div className="space-y-2.5">
          {model.teams.map((t) => {
            const val = t.spent ?? t.spentUsd ?? 0;
            const pct = Math.max(0, Math.min(100, (val / maxSpend) * 100));
            return (
              <div key={t.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <TeamLogo team={t.code} size="w-4 h-4 shrink-0" />
                    <span className="font-black" style={{ color: teamHex(t.code) }}>
                      {t.code}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[11.5px]">
                    {t.purchases.length ? spendText(t) : "—"}
                  </span>
                </div>
                <div className="mp-progress-track">
                  <div
                    className="mp-progress-fill"
                    style={{ width: `${pct}%`, background: teamHex(t.code) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Unsold Players */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Users className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Unsold Players ({unsoldAll.length})</span>
          </h2>
        </div>

        {unsoldAll.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--mp-muted)" }}
                />
                <input
                  type="search"
                  value={unsoldQuery}
                  onChange={(e) => setUnsoldQuery(e.target.value)}
                  placeholder="Filter unsold players…"
                  aria-label="Filter unsold players"
                  className="mp-input mp-input--search"
                />
              </div>
              <button
                type="button"
                onClick={() => setCappedOnly((v) => !v)}
                data-active={cappedOnly ? "true" : "false"}
                className="mp-filter-pill"
              >
                Capped
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {filteredUnsold.slice(0, 60).map((u) => (
                <Link
                  key={u.id}
                  href={`/players/${playerSlug(u.player)}`}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    u.capped
                      ? "border-rose-400/60 bg-rose-500/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {u.player}{" "}
                  <span style={{ color: "var(--mp-muted)" }}>
                    {u.country && u.country !== "India" ? "· OS " : ""}· {pulseMoney(u.base)}
                  </span>
                </Link>
              ))}
            </div>
            <div className="text-[10px]" style={{ color: "var(--mp-muted)" }}>
              Red outline = capped player. OS = overseas. Shows base price.
            </div>
          </div>
        ) : (
          <div className="text-xs" style={{ color: "var(--mp-muted)" }}>
            {model.historical
              ? "The archive doesn't record unsold players for this season."
              : "No unsold players recorded yet."}
          </div>
        )}

        <MobileSourcesBar model={model} />
      </section>

      {/* 5. Compact Expandable Franchise Squads Board */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Franchise Results Breakdown</span>
          </h2>
        </div>

        <div className="space-y-2">
          {model.teams.map((t) => {
            const isOpen = openTeamCode === t.code;
            return (
              <div
                key={t.code}
                className="rounded-xl border overflow-hidden"
                style={teamCardStyle(t.code)}
              >
                <button
                  type="button"
                  onClick={() => setOpenTeamCode(isOpen ? null : t.code)}
                  aria-expanded={isOpen}
                  className="mp-row-btn px-3 py-2.5"
                >
                  <TeamLogo team={t.code} size="w-5 h-5 shrink-0" />
                  <span className="font-black text-xs" style={{ color: teamHex(t.code) }}>
                    {t.code}
                  </span>
                  <span className="text-[11px] font-mono flex-1 text-right pr-1" style={{ color: "var(--mp-muted)" }}>
                    {t.purchases.length} bought · {spendText(t)}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    style={{ color: "var(--mp-muted)" }}
                  />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/10">
                    <FranchiseDetailBody t={t} model={model} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
