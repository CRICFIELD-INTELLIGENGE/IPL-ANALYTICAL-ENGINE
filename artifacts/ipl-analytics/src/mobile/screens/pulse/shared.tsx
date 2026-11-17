import React from "react";
import { Link } from "wouter";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { playerSlug } from "@/lib/aggregates";
import { pulseMoney, type PulseLot, type PulseModel } from "@/lib/pulse-auction";
import { buildInsightSummary, type PulseHookResult } from "@/lib/pulse-helpers";

export function MobileFeedBadge({ active, pulse }: { active: number; pulse: PulseHookResult }) {
  const isArchived = active !== 2027;
  const isErr = !isArchived && pulse.desk.isError;
  const dotColor = isArchived ? "bg-sky-400" : isErr ? "bg-rose-500" : "bg-amber-400";
  const text = isArchived
    ? "Archive · Verified Final Results"
    : isErr
      ? "Update Source Offline"
      : "Live Updates · Official Sources";

  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px]">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="truncate font-medium" style={{ color: "var(--mp-muted)" }}>
          {text}
        </span>
      </div>
      {isArchived && (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-500 shrink-0">
          <CheckCircle2 className="w-3 h-3" /> Verified
        </span>
      )}
    </div>
  );
}

export function MobileInsightBox({ lot, model }: { lot: PulseLot; model: PulseModel }) {
  const { band, value, money, peersCount, median, rank, similar, links } = buildInsightSummary(
    lot,
    model,
  );
  return (
    <div className="rounded-lg border border-purple-500/25 bg-purple-500/[0.06] p-2.5 space-y-2 text-[11.5px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-extrabold uppercase tracking-wider text-[9.5px] text-purple-400">
          CricField Intelligence
        </span>
        <Link
          href={`/players/${playerSlug(lot.player)}`}
          className="text-[11px] font-bold hover:underline"
          style={{ color: "var(--mp-accent)" }}
        >
          Player Profile →
        </Link>
      </div>
      {median != null && rank != null && value != null && band !== "Not recorded" && (
        <div style={{ color: "var(--mp-text)" }}>
          #{rank} of {peersCount} {band.toLowerCase()}s in {lot.season} · Role median{" "}
          <strong className="font-mono">{money(median)}</strong> ({(value / median).toFixed(1)}×)
        </div>
      )}
      {similar.length > 0 && band !== "Not recorded" && (
        <div style={{ color: "var(--mp-muted)" }}>
          Similar buys:{" "}
          {similar.map((s) => `${s.player} (${s.team}, ${pulseMoney(s.price, s.usd)})`).join(", ")}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {links.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="px-2 py-1 rounded border border-white/10 bg-white/[0.04] text-[10.5px] font-semibold"
            style={{ color: "var(--mp-text)" }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MobileSourcesBar({ model }: { model: PulseModel }) {
  const urls = [
    ...new Set(model.rows.map((r) => r.sourceUrl).filter((u): u is string => !!u)),
  ];
  if (!urls.length) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-white/10 text-[10.5px]"
      style={{ color: "var(--mp-muted)" }}
    >
      <span className="font-mono uppercase text-[9.5px]">Sources:</span>
      {urls.map((u) => {
        let host = u;
        try {
          host = new URL(u).hostname.replace(/^www\.|^en\./, "");
        } catch {
          // keep url fallback
        }
        return (
          <a
            key={u}
            href={u}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold hover:underline"
            style={{ color: "var(--mp-accent)" }}
          >
            {host} <ExternalLink className="w-3 h-3" />
          </a>
        );
      })}
    </div>
  );
}

export function MobileNewsroomLinks() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-white/10 text-[11px] font-semibold">
      <Link href="/feed/auction" style={{ color: "var(--mp-accent)" }}>
        Auction Analysis →
      </Link>
      <Link href="/dugout" style={{ color: "var(--mp-accent)" }}>
        Editorial Dugout →
      </Link>
    </div>
  );
}
