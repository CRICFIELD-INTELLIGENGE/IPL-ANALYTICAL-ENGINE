import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { Brain, ChevronDown, Gavel, Radio, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { Sheet } from "@/mobile/shell";
import { playerSlug } from "@/lib/aggregates";
import { stamp } from "@/lib/ipl-2027-desk";
import { pulseMoney, type PulseLot, type PulseModel } from "@/lib/pulse-auction";
import {
  BASE_BANDS,
  STATUS_LABEL,
  STATUS_TONE,
  baseBand,
  roleBand,
  spendText,
  teamCardStyle,
  teamHex,
  unsoldText,
  type PulseHookResult,
} from "@/lib/pulse-helpers";
import { MobileFeedBadge, MobileInsightBox, MobileSourcesBar } from "./shared";

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE AUCTION TAB
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileLiveAuctionTab({
  model,
  pulse,
  active,
}: {
  model: PulseModel;
  pulse: PulseHookResult;
  active: number;
}) {
  const [snapIdx, setSnapIdx] = useState(0);
  const [openLotId, setOpenLotId] = useState<string | null>(null);

  const historical = active !== 2027;
  const lot = historical
    ? model.rows[Math.min(snapIdx, Math.max(0, model.rows.length - 1))]
    : model.onBlock ??
      [...model.rows]
        .filter((r) => r.recordedAt)
        .sort((a, b) => b.recordedAt!.localeCompare(a.recordedAt!))[0];

  const recent = historical
    ? model.purchases.slice(0, 10)
    : model.purchases
        .filter((p) => p.recordedAt)
        .sort((a, b) => b.recordedAt!.localeCompare(a.recordedAt!))
        .slice(0, 10);

  const doneCount = model.rows.filter((r) =>
    ["sold", "unsold", "withdrawn", "recorded"].includes(r.status),
  ).length;

  return (
    <div className="space-y-3" data-testid="pulse-tab-live">
      {/* Current / Snapshot Lot */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Gavel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {historical ? "Result Snapshot" : model.onBlock ? "Current Lot" : "Latest Recorded Lot"}
            </span>
          </h2>
          {historical && model.rows.length > 0 && (
            <span className="mp-card-sub">
              {snapIdx + 1}/{model.rows.length}
            </span>
          )}
        </div>

        <MobileFeedBadge active={active} pulse={pulse} />

        {lot ? (
          <div className="rounded-xl border p-3 space-y-2.5" style={teamCardStyle(lot.status === "sold" ? lot.team : null)}>
            <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--mp-muted)" }}>
              {[
                lot.lot != null && `Lot #${String(lot.lot).padStart(3, "0")}`,
                roleBand(lot.role),
                lot.country,
                lot.country && (lot.country === "India" ? "Indian" : "Overseas"),
                lot.age != null && `Age ${lot.age}`,
                lot.capped != null && (lot.capped ? "Capped" : "Uncapped"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>

            {lot.set && (
              <div className="text-[11px] font-semibold text-cyan-400">{lot.set}</div>
            )}

            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/players/${playerSlug(lot.player)}`}
                className="text-xl font-black tracking-tight hover:underline min-w-0 truncate"
              >
                {lot.player}
              </Link>
              {lot.status === "sold" && lot.team && (
                <TeamLogo team={lot.team} size="w-7 h-7 shrink-0" />
              )}
            </div>

            <div className="mp-kpi-grid-3">
              <div className="mp-kpi">
                <div className="mp-kpi-label">Base Price</div>
                <div className="mp-kpi-val text-xs">{pulseMoney(lot.base, lot.baseUsd)}</div>
              </div>
              <div className="mp-kpi">
                <div className="mp-kpi-label">{lot.status === "sold" ? "Final Price" : "Current Bid"}</div>
                <div className="mp-kpi-val text-xs" style={{ color: "var(--mp-ok)" }}>
                  {lot.status === "sold" ? pulseMoney(lot.price, lot.usd) : "Not provided"}
                </div>
              </div>
              <div className="mp-kpi">
                <div className="mp-kpi-label">{lot.status === "sold" ? "Bought By" : "Status"}</div>
                <div
                  className={`mp-kpi-val text-xs ${STATUS_TONE[lot.status] ?? ""}`}
                  style={lot.status === "sold" && lot.team ? { color: teamHex(lot.team) } : undefined}
                >
                  {lot.status === "sold" ? lot.team : STATUS_LABEL[lot.status]}
                </div>
              </div>
            </div>

            {lot.status === "sold" && <MobileInsightBox lot={lot} model={model} />}
          </div>
        ) : (
          <div className="text-xs py-2" style={{ color: "var(--mp-muted)" }}>
            No lots recorded yet. Updates appear here as official results are published.
          </div>
        )}

        {historical && model.rows.length > 1 && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSnapIdx((i) => Math.max(0, i - 1))}
              disabled={snapIdx <= 0}
              className="mp-chip-btn px-2.5 disabled:opacity-40"
            >
              Prev
            </button>
            <input
              type="range"
              min={0}
              max={model.rows.length - 1}
              value={snapIdx}
              onChange={(e) => setSnapIdx(Number(e.target.value))}
              aria-label="Snapshot lot selector"
              className="flex-1 accent-orange-500 min-w-0"
            />
            <button
              type="button"
              onClick={() => setSnapIdx((i) => Math.min(model.rows.length - 1, i + 1))}
              disabled={snapIdx >= model.rows.length - 1}
              className="mp-chip-btn px-2.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* Auction Progress 6-tile Strip */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Radio className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>Auction Progress</span>
          </h2>
        </div>

        <div className="mp-kpi-grid-3">
          <div className="mp-kpi">
            <div className="mp-kpi-label">Completed</div>
            <div className="mp-kpi-val text-xs">{doneCount}</div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Remaining</div>
            <div className="mp-kpi-val text-xs">{Math.max(0, model.rows.length - doneCount)}</div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Sold</div>
            <div className="mp-kpi-val text-xs" style={{ color: "var(--mp-ok)" }}>
              {model.sold}
            </div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Unsold</div>
            <div className="mp-kpi-val text-xs" style={{ color: "var(--mp-bad)" }}>
              {unsoldText(model)}
            </div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Spend</div>
            <div className="mp-kpi-val text-xs" style={{ color: "var(--mp-amber)" }}>
              {spendText(model)}
            </div>
          </div>
          <div className="mp-kpi">
            <div className="mp-kpi-label">Pending</div>
            <div className="mp-kpi-val text-xs" style={{ color: "var(--mp-purple)" }}>
              {model.pending}
            </div>
          </div>
        </div>
      </section>

      {/* Recently Sold / Confirmed Purchases */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Gavel className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{historical ? "Confirmed Purchases" : "Recently Sold"}</span>
          </h2>
          <span className="mp-card-sub">{recent.length} lots</span>
        </div>

        {recent.length ? (
          <div className="mp-list-divider">
            {recent.map((item) => {
              const isOpen = openLotId === item.id;
              return (
                <div key={item.id} className="py-2">
                  <div className="flex items-center gap-2">
                    {item.team && <TeamLogo team={item.team} size="w-5 h-5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/players/${playerSlug(item.player)}`}
                        className="block text-xs font-bold truncate hover:underline"
                      >
                        {item.player}
                      </Link>
                      <div className="text-[10px]" style={{ color: "var(--mp-muted)" }}>
                        {roleBand(item.role)}
                        {item.team ? ` · ${item.team}` : ""}
                        {item.recordedAt ? ` · ${stamp(item.recordedAt)}` : ""}
                      </div>
                    </div>
                    <span className="font-mono font-black text-xs text-emerald-400 shrink-0">
                      {pulseMoney(item.price, item.usd)}
                    </span>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`Insight for ${item.player}`}
                      onClick={() => setOpenLotId(isOpen ? null : item.id)}
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
            No confirmed purchases yet.
          </div>
        )}
      </section>

      {/* Up Next */}
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Up Next</span>
          </h2>
        </div>
        {model.upcoming.length ? (
          <div className="mp-list-divider">
            {model.upcoming.slice(0, 10).map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                <div className="min-w-0">
                  <Link href={`/players/${playerSlug(u.player)}`} className="font-bold truncate block">
                    {u.player}
                  </Link>
                  <span className="text-[10px]" style={{ color: "var(--mp-muted)" }}>
                    {roleBand(u.role)} {u.lot != null ? `· Lot #${u.lot}` : ""}
                  </span>
                </div>
                <span className="font-mono text-[11px] shrink-0" style={{ color: "var(--mp-muted)" }}>
                  {pulseMoney(u.base, u.baseUsd)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs" style={{ color: "var(--mp-muted)" }}>
            {historical
              ? "Lot presentation order isn't stored in this historical archive."
              : "Upcoming lot order hasn't been published yet."}
          </div>
        )}
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLAYER POOL TAB (6 filters in bottom sheet + expandable mobile rows)
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobilePlayerPoolTab({ model }: { model: PulseModel }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("");
  const [base, setBase] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const countries = useMemo(
    () =>
      [...new Set(model.rows.map((r) => r.country).filter((c): c is string => !!c))].sort(),
    [model.rows],
  );
  const statuses = useMemo(() => [...new Set(model.rows.map((r) => r.status))], [model.rows]);

  const rows = useMemo(
    () =>
      model.rows.filter(
        (r) =>
          (!q || r.player.toLowerCase().includes(q.toLowerCase())) &&
          (!role || roleBand(r.role) === role) &&
          (!country || r.country === country) &&
          (!base || baseBand(r.base) === base) &&
          (!team || r.team === team) &&
          (!status || r.status === status),
      ),
    [model.rows, q, role, country, base, team, status],
  );

  const activeFilters: { key: string; label: string; clear: () => void }[] = [
    role ? { key: "role", label: `Role: ${role}`, clear: () => setRole("") } : null,
    country ? { key: "country", label: `Country: ${country}`, clear: () => setCountry("") } : null,
    base ? { key: "base", label: `Base: ${base}`, clear: () => setBase("") } : null,
    team ? { key: "team", label: `Team: ${team}`, clear: () => setTeam("") } : null,
    status
      ? { key: "status", label: `Status: ${STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status}`, clear: () => setStatus("") }
      : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const clearAll = () => {
    setQ("");
    setRole("");
    setCountry("");
    setBase("");
    setTeam("");
    setStatus("");
  };

  return (
    <div className="space-y-3" data-testid="pulse-tab-pool">
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Player Pool · IPL {model.season}</span>
          </h2>
          <span className="mp-card-sub">
            {rows.length}/{model.rows.length}
          </span>
        </div>

        {/* Search + Filter Bottom Sheet Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--mp-muted)" }}
            />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(50);
              }}
              placeholder="Search player name…"
              aria-label="Search player name"
              className="mp-input mp-input--search"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            data-active={activeFilters.length > 0 ? "true" : "false"}
            className="mp-chip-btn shrink-0"
            aria-label="Open player pool filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black"
                style={{ background: "var(--mp-accent)", color: "#050816" }}
              >
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Filter Pills */}
        {activeFilters.length > 0 && (
          <div className="mp-hscroll">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.clear}
                data-active="true"
                className="mp-filter-pill"
              >
                <span>{f.label}</span>
                <X className="w-3 h-3" />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="mp-filter-pill">
              Clear All
            </button>
          </div>
        )}

        {model.historical && (
          <div className="text-[10.5px]" style={{ color: "var(--mp-muted)" }}>
            {model.unsold
              ? "Shows sold and unsold lots presented at auction."
              : "Historical archive lists confirmed sold players."}
          </div>
        )}

        {/* Expandable Mobile Player Rows */}
        {rows.length > 0 ? (
          <div className="mp-list-divider">
            {rows.slice(0, limit).map((r: PulseLot) => {
              const isOpen = expandedId === r.id;
              return (
                <div key={r.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : r.id)}
                    aria-expanded={isOpen}
                    className="mp-row-btn"
                  >
                    {r.team ? (
                      <TeamLogo team={r.team} size="w-6 h-6 shrink-0" />
                    ) : (
                      <span className="w-6 h-6 rounded-full border border-white/10 grid place-items-center text-[9px] font-mono shrink-0" style={{ color: "var(--mp-muted)" }}>
                        {r.lot ?? "—"}
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-bold truncate">{r.player}</div>
                      <div className="text-[10.5px] truncate" style={{ color: "var(--mp-muted)" }}>
                        {roleBand(r.role)}
                        {r.country ? ` · ${r.country}` : ""}
                        {` · Base ${pulseMoney(r.base, r.baseUsd)}`}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-mono ${r.status === "sold" ? "font-black text-emerald-400" : STATUS_TONE[r.status] ?? ""}`}
                      >
                        {r.status === "sold"
                          ? pulseMoney(r.price, r.usd)
                          : STATUS_LABEL[r.status]}
                      </div>
                      <div
                        className="text-[10px] font-mono font-bold"
                        style={{ color: r.team ? teamHex(r.team) : "var(--mp-muted)" }}
                      >
                        {r.team ?? "Pool"}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      style={{ color: "var(--mp-muted)" }}
                    />
                  </button>

                  {isOpen && (
                    <div className="pb-3 space-y-2">
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-2.5 py-2 rounded-lg border border-white/10 bg-white/[0.025]"
                        style={{ color: "var(--mp-muted)" }}
                      >
                        <span>
                          Lot {r.lot ?? "—"}
                          {r.set ? ` · ${r.set.replace(/^Set \d+: /, "")}` : ""}
                        </span>
                        <Link
                          href={`/players/${playerSlug(r.player)}`}
                          className="font-bold hover:underline"
                          style={{ color: "var(--mp-accent)" }}
                        >
                          Open Player Profile →
                        </Link>
                      </div>
                      {r.status === "sold" && <MobileInsightBox lot={r} model={model} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <div className="text-xs font-semibold" style={{ color: "var(--mp-muted)" }}>
              No players match your active filters.
            </div>
            <button type="button" onClick={clearAll} className="mp-chip-btn">
              Reset Filters
            </button>
          </div>
        )}

        {rows.length > limit && (
          <button
            type="button"
            onClick={() => setLimit((n) => n + 50)}
            className="mp-chip-btn w-full"
          >
            Show 50 more ({rows.length - limit} remaining)
          </button>
        )}

        <MobileSourcesBar model={model} />
      </section>

      {/* Filter Bottom Sheet */}
      {filterSheetOpen && (
        <Sheet title="Filter Player Pool" onClose={() => setFilterSheetOpen(false)}>
          <div className="space-y-3 pb-2">
            <div>
              <label className="mp-kpi-label block mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label="Filter by role"
                className="mp-select"
              >
                <option value="">All roles</option>
                {["Batter", "Bowler", "All-rounder", "Wicketkeeper", "Not recorded"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mp-kpi-label block mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Filter by country"
                className="mp-select"
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mp-kpi-label block mb-1">Base Price</label>
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                aria-label="Filter by base price"
                className="mp-select"
              >
                <option value="">Any base price</option>
                {BASE_BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mp-kpi-label block mb-1">Franchise</label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                aria-label="Filter by franchise"
                className="mp-select"
              >
                <option value="">All franchises</option>
                {model.teams.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mp-kpi-label block mb-1">Auction Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="mp-select"
              >
                <option value="">Any status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={clearAll} className="mp-chip-btn flex-1">
                Clear All
              </button>
              <button
                type="button"
                onClick={() => {
                  setLimit(50);
                  setFilterSheetOpen(false);
                }}
                className="mp-chip-btn flex-1"
                style={{
                  background: "var(--mp-accent)",
                  borderColor: "var(--mp-accent)",
                  color: "#050816",
                }}
              >
                Apply ({rows.length})
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
