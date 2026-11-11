import { useMemo } from "react";
import { usePlayerAuctions, useSquadsBySeason, usePlayerBios, type AuctionRecord, type SquadsBySeason, type PlayerBio, type SquadPlayer, playerSlug } from "./aggregates";
import { resolveTeamCode, isTeamCode } from "./team-context";
import { HUB_TEAMS } from "./ipl-2027";
import { useIpl2027Desk, type DeskSummary } from "./ipl-2027-desk";
import foundation from "@/data/auction-2026-foundation.json";
// Lot numbers, auction sets and the 79 unsold players for 2026 (Wikipedia sold tables + Olympics.com unsold list).
import lotSheet2026 from "@/data/auction-2026-lots.json";

export const PULSE_TABS = ["Overview", "Live Auction", "Player Pool", "Franchises", "Retentions", "Results", "Live Blog", "Archive"] as const;
export type PulseTab = (typeof PULSE_TABS)[number];
export type PulseStatus = "registered" | "shortlisted" | "pending" | "on-block" | "sold" | "unsold" | "withdrawn" | "recorded";
export interface PulseLot {
  id: string; player: string; season: number; team: string | null; teamName: string | null;
  role: string; country: string | null; age: number | null; statsName: string | null; price: number | null; usd: number | null;
  base: number | null; baseUsd: number | null; status: PulseStatus; lot: number | null; set: string | null; capped: boolean | null; recordedAt: string | null; sourceUrl: string | null;
}
export interface PulseTeam {
  code: string; purchases: PulseLot[]; core: SquadPlayer[]; retained: number | null; spent: number | null; spentUsd: number | null;
  startingPurse: number | null; remaining: number | null; squad: number | null; overseas: number | null; slots: number | null;
}
export const normaliseAuctionName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
// Preserve defunct franchises instead of dropping them or assigning a modern successor.
export const pulseTeamKey = (name?: string | null) => resolveTeamCode(name) ?? (name?.trim() || null);
export function safeSource(value?: string | null): string | null { try { const url = new URL(value ?? ""); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; } }
export function pulseMoney(lakhs: number | null | undefined, usd: number | null = null) {
  if (lakhs != null && Number.isFinite(lakhs)) return lakhs >= 100 ? `₹${(lakhs / 100).toFixed(2)} Cr` : `₹${lakhs.toLocaleString("en-IN")} L`;
  return usd != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(usd) : "Not recorded";
}
// 2008-13 sales are recorded in USD only, so sums and rankings fall back to USD when no rupee price exists.
export const lotValue = (lot: PulseLot) => lot.price ?? lot.usd;
const sumUsd = (lots: PulseLot[]) => lots.length && lots.every(lot => lot.price == null && lot.usd != null) ? lots.reduce((sum, lot) => sum + lot.usd!, 0) : null;
export function auctionAge(birthDate: string | undefined, atDate: string | undefined): number | null {
  if (!birthDate || !atDate) return null;
  const birth = new Date(birthDate), at = new Date(atDate);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(at.getTime())) return null;
  const age = at.getUTCFullYear() - birth.getUTCFullYear() - Number(at.getUTCMonth() < birth.getUTCMonth() || at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate());
  return age >= 14 && age <= 65 ? age : null;
}
export function buildPulseModel(season: number, records: AuctionRecord[], squads: SquadsBySeason, bios: Record<string, PlayerBio>, desk?: DeskSummary) {
  const historical = season !== 2027;
  const seasonSquads = squads[String(season)] ?? {};
  const byName = new Map<string, SquadPlayer>();
  for (const players of Object.values(seasonSquads)) for (const player of players) { byName.set(normaliseAuctionName(player.name), player); if (player.cricsheetName) byName.set(normaliseAuctionName(player.cricsheetName), player); }
  const bioNames = new Map<string, PlayerBio>();
  for (const [key, bio] of Object.entries(bios)) for (const name of [key, bio.playerName, bio.fullName]) if (name) bioNames.set(normaliseAuctionName(name), bio);
  const details = (name: string, role?: string | null, country?: string | null) => {
    const squad = byName.get(normaliseAuctionName(name));
    const bio = bioNames.get(normaliseAuctionName(name)) ?? (squad?.cricsheetName ? bioNames.get(normaliseAuctionName(squad.cricsheetName)) : undefined);
    return { statsName: squad?.cricsheetName ?? null, role: role || squad?.role || bio?.role || "Not recorded", country: country || squad?.country || bio?.country || null, age: auctionAge(bio?.birthDate, season === 2026 ? foundation.eventDate : undefined) };
  };
  const sheet = season === lotSheet2026.season ? lotSheet2026 : null;
  const sheetSold = new Map((sheet?.lots ?? []).filter(l => l.status === "sold").map(l => [normaliseAuctionName(l.player), l]));
  const archived: PulseLot[] = historical ? records.filter(record => record.season === season).map((record, index) => {
    const entry = sheetSold.get(normaliseAuctionName(record.player));
    return {
      id: `${season}-${playerSlug(record.player)}-${index}`, player: record.player, season,
      team: pulseTeamKey(record.teamCanonical ?? record.team), teamName: record.teamCanonical ?? record.team,
      ...details(record.player, record.role ?? entry?.role, record.country), price: record.soldLakh, usd: record.soldUsd,
      base: record.baseLakh, baseUsd: record.baseUsd, status: record.team && (record.soldLakh != null || record.soldUsd != null) ? "sold" : "recorded",
      lot: entry?.lot ?? null, set: entry?.set ?? null, capped: entry?.capped ?? null, recordedAt: null, sourceUrl: entry ? sheet!.sources.sold : null,
    };
  }) : [];
  const unsold: PulseLot[] = (sheet?.lots ?? []).filter(l => l.status === "unsold").map(l => ({
    id: `${season}-unsold-${playerSlug(l.player)}`, player: l.player, season, team: null, teamName: null,
    ...details(l.player, l.role, l.country), price: null, usd: null, base: l.baseLakh, baseUsd: null,
    status: "unsold", lot: null, set: null, capped: l.capped, recordedAt: null, sourceUrl: sheet!.sources.unsold,
  }));
  const rows: PulseLot[] = historical
    ? [...archived, ...unsold].sort((a, b) => (a.lot ?? Infinity) - (b.lot ?? Infinity))
    : (desk?.lots ?? []).map(lot => ({
      id: `2027-lot-${lot.lot}`, player: lot.player, season, team: resolveTeamCode(lot.team), teamName: lot.team ?? null,
      ...details(lot.player, lot.role), price: lot.priceLakhs ?? null, usd: null, base: lot.basePriceLakhs ?? null, baseUsd: null,
      status: lot.status, lot: lot.lot, set: null, capped: null, recordedAt: lot.recordedAt, sourceUrl: safeSource(lot.sourceUrl),
    }));
  const purchases = rows.filter(row => row.status === "sold");
  const ranked = [...purchases].sort((a, b) => (lotValue(b) ?? -1) - (lotValue(a) ?? -1) || a.player.localeCompare(b.player));
  const teamKeys = historical && season !== 2026
    ? [...new Set([...Object.keys(seasonSquads).map(pulseTeamKey), ...purchases.map(row => row.team)].filter((key): key is string => key != null))]
    : [...HUB_TEAMS];
  const teams: PulseTeam[] = teamKeys.map(code => {
    const bought = purchases.filter(row => row.team === code);
    const roster = Object.entries(seasonSquads).find(([name]) => pulseTeamKey(name) === code)?.[1] ?? [];
    const core = historical ? roster.filter(player => player.acquisition === "retained") : (desk?.retentions ?? []).filter(player => player.team === code && player.decision === "retained").map(player => ({ name: player.player, cricsheetName: null, country: details(player.player).country, role: details(player.player).role, acquisition: "retained" as const, priceLakh: player.priceLakhs ?? null, priceUsd: null, priceDisplay: player.priceLakhs == null ? null : pulseMoney(player.priceLakhs), played: false }));
    const official = season === 2026 && isTeamCode(code) ? foundation.teams[code] : null;
    const deskTeam = !historical ? desk?.teams.find(team => team.team === code) : undefined;
    const spent = bought.every(player => player.price != null) ? bought.reduce((sum, player) => sum + player.price!, 0) : null;
    const startingPurse = official?.startingPurseLakhs ?? deskTeam?.startPurseLakhs ?? null;
    const retained = official?.retained ?? (core.length ? core.length : null);
    const squad = retained == null ? null : retained + bought.length;
    const overseas = official && bought.every(player => player.country) ? official.overseasRetained + bought.filter(player => player.country !== "India").length : null;
    return { code, purchases: bought, core, retained, spent, spentUsd: sumUsd(bought), startingPurse, remaining: startingPurse != null && spent != null ? startingPurse - spent : null, squad, overseas, slots: official && squad != null ? Math.max(0, foundation.maxSquad - squad) : null };
  });
  const spent = purchases.length && purchases.every(player => player.price != null) ? purchases.reduce((sum, player) => sum + player.price!, 0) : null;
  return { historical, season, rows, purchases, ranked, teams, spent, spentUsd: sumUsd(purchases), sold: purchases.length, unsold: rows.filter(row => row.status === "unsold").length, pending: rows.filter(row => row.status === "pending").length, onBlock: rows.find(row => row.status === "on-block"), upcoming: rows.filter(row => row.status === "pending").sort((a, b) => (a.lot ?? Infinity) - (b.lot ?? Infinity)), foundation: season === 2026 ? foundation : null };
}
export function usePulseAuction(season: number) {
  const archive = usePlayerAuctions(), squads = useSquadsBySeason(), bios = usePlayerBios();
  const desk = useIpl2027Desk(season === 2027 ? 30_000 : false);
  const model = useMemo(() => buildPulseModel(season, archive.data ?? [], squads.data ?? {}, bios.data ?? {}, desk.data), [season, archive.data, squads.data, bios.data, desk.data]);
  return { model, archive, squads, desk, loading: season === 2027 ? desk.isLoading : archive.isLoading, error: season === 2027 ? desk.isError : archive.isError, seasons: [...new Set((archive.data ?? []).map(row => row.season))].sort((a, b) => b - a) };
}
export type PulseModel = ReturnType<typeof buildPulseModel>;
