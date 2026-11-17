import React, { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Gavel, History, Newspaper, Users, Wallet } from "lucide-react";
import { stamp } from "@/lib/ipl-2027-desk";
import { pulseMoney, type PulseModel, type PulseTab } from "@/lib/pulse-auction";
import { STATUS_LABEL, teamHex, type PulseHookResult } from "@/lib/pulse-helpers";
import { MobileNewsroomLinks } from "./shared";

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE BLOG TAB
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileLiveBlogTab({
  model,
  pulse,
}: {
  model: PulseModel;
  pulse: PulseHookResult;
}) {
  const [filterTag, setFilterTag] = useState<string>("All");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const desk = pulse.desk.data;

  const entries = useMemo(() => {
    const raw = [
      ...(desk?.announcements ?? []).map((a) => ({
        at: a.recordedAt,
        team: a.team,
        text: a.headline,
        src: a.sourceUrl,
        tag: a.verification,
        publishedOn: (a as any).publishedOn as string | undefined,
        eventDate: (a as any).eventDate as string | undefined,
        context: (a as any).context as string | undefined,
      })),
      ...(model.historical
        ? []
        : model.rows
            .filter((r) => r.recordedAt && r.status !== "pending")
            .map((r) => ({
              at: r.recordedAt!,
              team: r.team ?? undefined,
              src: r.sourceUrl ?? undefined,
              tag: "Official Announcement" as const,
              publishedOn: undefined,
              eventDate: undefined,
              context: undefined,
              text:
                r.status === "sold"
                  ? `${r.player} sold to ${r.team} for ${pulseMoney(r.price)}`
                  : `${r.player}: ${STATUS_LABEL[r.status].toLowerCase()}`,
            }))),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return raw;
  }, [desk, model]);

  const tags = ["All", "Official Announcement", "Credible Report", "Analyst Prediction", "Rumor"];
  const visible = useMemo(
    () =>
      filterTag === "All"
        ? entries
        : entries.filter((e) => String(e.tag).toLowerCase() === filterTag.toLowerCase()),
    [entries, filterTag],
  );

  const badgeStyle = (tag: string): React.CSSProperties => {
    switch (tag) {
      case "Official Announcement":
      case "confirmed":
        return {
          background: "rgba(16, 185, 129, 0.14)",
          color: "#34d399",
          borderColor: "rgba(16, 185, 129, 0.35)",
        };
      case "Credible Report":
      case "reported":
        return {
          background: "rgba(6, 182, 212, 0.14)",
          color: "#22d3ee",
          borderColor: "rgba(6, 182, 212, 0.35)",
        };
      case "Analyst Prediction":
        return {
          background: "rgba(168, 85, 247, 0.14)",
          color: "#c084fc",
          borderColor: "rgba(168, 85, 247, 0.35)",
        };
      case "Rumor":
        return {
          background: "rgba(245, 158, 11, 0.14)",
          color: "#fbbf24",
          borderColor: "rgba(245, 158, 11, 0.35)",
        };
      default:
        return {
          background: "var(--mp-surface-muted)",
          color: "var(--mp-muted)",
          borderColor: "var(--mp-border)",
        };
    }
  };

  return (
    <div className="space-y-3" data-testid="pulse-tab-liveblog">
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <Newspaper className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Auction Live Blog</span>
          </h2>
          <span className="mp-card-sub">{visible.length} updates</span>
        </div>

        {/* Verification Classification Filter */}
        <div className="mp-hscroll">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setFilterTag(t);
                setOpenIdx(null);
              }}
              data-active={filterTag === t ? "true" : "false"}
              className="mp-filter-pill"
            >
              {t}
            </button>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className="space-y-2.5">
            {visible.slice(0, 60).map((e, idx) => {
              const isOpen = openIdx === idx;
              return (
                <article
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="px-2 py-0.5 rounded-full border text-[9.5px] font-mono font-extrabold uppercase tracking-wide shrink-0"
                        style={badgeStyle(String(e.tag))}
                      >
                        {e.tag}
                      </span>
                      {e.team && (
                        <span
                          className="text-[10.5px] font-mono font-black px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10"
                          style={{ color: teamHex(e.team) }}
                        >
                          {e.team}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--mp-muted)" }}>
                      {stamp(e.at)}
                    </span>
                  </div>

                  <h3 className="text-[13px] font-bold leading-snug m-0">{e.text}</h3>

                  {(e.context || e.publishedOn || e.eventDate) && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenIdx(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold"
                        style={{ color: "var(--mp-accent)" }}
                      >
                        <span>{isOpen ? "Hide analysis" : "Franchise context & analysis"}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="mt-2 p-2.5 rounded-lg border border-white/10 bg-black/25 space-y-1 text-[11.5px]">
                          {(e.publishedOn || e.eventDate) && (
                            <div className="text-[10px] font-mono" style={{ color: "var(--mp-muted)" }}>
                              {e.publishedOn ? `Published: ${e.publishedOn}` : ""}
                              {e.publishedOn && e.eventDate ? " · " : ""}
                              {e.eventDate ? `Event: ${e.eventDate}` : ""}
                            </div>
                          )}
                          {e.context && <p className="m-0 leading-relaxed">{e.context}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10 text-[10.5px]">
                    <span style={{ color: "var(--mp-muted)" }}>
                      {String(e.tag) === "Official Announcement"
                        ? "Verified official release"
                        : String(e.tag) === "Credible Report"
                          ? "Tier-1 journalist report"
                          : String(e.tag) === "Analyst Prediction"
                            ? "CricField tactical projection"
                            : "Market discussion / rumor"}
                    </span>
                    {e.src && (
                      <a
                        href={e.src}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold shrink-0"
                        style={{ color: "var(--mp-accent)" }}
                      >
                        Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-xs py-4 text-center" style={{ color: "var(--mp-muted)" }}>
            No updates match this classification filter yet.
          </div>
        )}

        <MobileNewsroomLinks />
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ARCHIVE TAB
   ═══════════════════════════════════════════════════════════════════════════ */
export function MobileArchiveTab({
  pulse,
  active,
  onSelectSeasonAndTab,
}: {
  pulse: PulseHookResult;
  active: number;
  onSelectSeasonAndTab: (season: number, tab?: PulseTab) => void;
}) {
  const rows = pulse.archive.data ?? [];
  const defaultYear = pulse.seasons.includes(active) ? active : (pulse.seasons[0] ?? active);
  const [inspectYear, setInspectYear] = useState<number>(defaultYear);

  const summaryFor = (s: number) => {
    const sold = rows.filter((r) => r.season === s && (r.soldLakh != null || r.soldUsd != null));
    const inr = sold.every((r) => r.soldLakh != null);
    const val = (r: (typeof sold)[number]) => (inr ? r.soldLakh : r.soldUsd) ?? 0;
    const total = sold.reduce((n, r) => n + val(r), 0);
    const top = sold.reduce<(typeof sold)[number] | undefined>(
      (a, r) => (!a || val(r) > val(a) ? r : a),
      undefined,
    );
    return { sold, inr, total, top };
  };

  const inspected = summaryFor(inspectYear);

  return (
    <div className="space-y-3" data-testid="pulse-tab-archive">
      <section className="mp-card">
        <div className="mp-card-head">
          <h2 className="mp-card-title">
            <History className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>IPL Auction Archive</span>
          </h2>
          <span className="mp-card-sub">{pulse.seasons.length} seasons</span>
        </div>

        {/* Horizontal Season Selector Pills */}
        <div className="mp-hscroll" role="tablist" aria-label="Archive seasons">
          {pulse.seasons.map((s) => {
            const on = s === inspectYear;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={on}
                data-active={on ? "true" : "false"}
                onClick={() => setInspectYear(s)}
                className="mp-filter-pill"
              >
                IPL {s}
              </button>
            );
          })}
        </div>

        {/* Selected Season Snapshot Card */}
        <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase" style={{ color: "var(--mp-accent)" }}>
                Historical Snapshot
              </div>
              <div className="text-lg font-black tracking-tight">IPL {inspectYear}</div>
            </div>
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded border border-white/10" style={{ color: "var(--mp-muted)" }}>
              {inspected.inr ? "INR Standard" : "USD Archive"}
            </span>
          </div>

          <div className="mp-kpi-grid">
            <div className="mp-kpi">
              <div className="mp-kpi-label">Recorded Sales</div>
              <div className="mp-kpi-val" style={{ color: "var(--mp-ok)" }}>
                {inspected.sold.length}
              </div>
            </div>
            <div className="mp-kpi">
              <div className="mp-kpi-label">Total Expenditure</div>
              <div className="mp-kpi-val" style={{ color: "var(--mp-amber)" }}>
                {inspected.inr ? pulseMoney(inspected.total) : pulseMoney(null, inspected.total)}
              </div>
            </div>
            <div className="mp-kpi col-span-2">
              <div className="mp-kpi-label">Highest Purchase</div>
              <div className="mp-kpi-val text-xs">
                {inspected.top
                  ? `${inspected.top.player} · ${pulseMoney(inspected.top.soldLakh, inspected.top.soldUsd)}`
                  : "Not recorded"}
              </div>
            </div>
          </div>

          {/* Direct Jump Actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onSelectSeasonAndTab(inspectYear, "Results")}
              className="mp-chip-btn text-[11px] px-2"
            >
              <Gavel className="w-3.5 h-3.5 text-emerald-400" />
              <span>Results</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectSeasonAndTab(inspectYear, "Player Pool")}
              className="mp-chip-btn text-[11px] px-2"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pool</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectSeasonAndTab(inspectYear, "Franchises")}
              className="mp-chip-btn text-[11px] px-2"
            >
              <Wallet className="w-3.5 h-3.5 text-purple-400" />
              <span>Squads</span>
            </button>
          </div>
        </div>

        {/* Full Archive Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {pulse.seasons.map((s) => {
            const info = summaryFor(s);
            const isCurrent = s === active;
            const isInspected = s === inspectYear;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setInspectYear(s);
                  onSelectSeasonAndTab(s, "Results");
                }}
                className="text-left rounded-xl border p-2.5 space-y-1 transition-colors"
                style={{
                  borderColor: isInspected
                    ? "var(--mp-accent)"
                    : isCurrent
                      ? "rgba(56, 189, 248, 0.5)"
                      : "var(--mp-border)",
                  background: isInspected ? "var(--mp-accent-soft)" : "var(--mp-surface-muted)",
                  color: "var(--mp-text)",
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-black text-xs">IPL {s}</span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono uppercase text-cyan-400">Active</span>
                  )}
                </div>
                <div className="text-[10.5px] font-mono" style={{ color: "var(--mp-muted)" }}>
                  {info.sold.length} ·{" "}
                  {info.inr ? pulseMoney(info.total) : pulseMoney(null, info.total)}
                </div>
                {info.top && (
                  <div className="text-[10px] truncate" style={{ color: "var(--mp-muted)" }}>
                    Top: {info.top.player}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
