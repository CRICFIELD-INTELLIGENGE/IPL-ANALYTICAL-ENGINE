// IPL 2027 desk: official announcements, retention decisions, purses and auction lots, entered by an
// admin from official sources (api-server routes/auction-2027.ts). Pulse, the Feed newsroom and the
// retentions list all read this one record set, so nothing is duplicated between pages.
import { useQuery } from "@tanstack/react-query";

export interface DeskAnnouncement { id: string; headline: string; team?: string; verification: "confirmed" | "reported"; sourceUrl: string; firstRecordedAt: string; recordedAt: string }
export interface DeskRetention { team: string; player: string; decision: "retained" | "released"; priceLakhs?: number; sourceUrl: string; recordedAt: string }
export interface DeskLot { lot: number; player: string; role?: string; basePriceLakhs?: number; status: "registered" | "shortlisted" | "pending" | "on-block" | "sold" | "unsold" | "withdrawn"; team?: string; priceLakhs?: number; sourceUrl?: string; recordedAt: string }
export interface DeskSummary {
  updatedAt: string | null;
  announcements: DeskAnnouncement[];
  retentions: DeskRetention[];
  lots: DeskLot[];
  teams: { team: string; players: number; spentLakhs: number; startPurseLakhs?: number | null; remainingLakhs: number | null }[];
}

export const crore = (l: number) => `₹${(l / 100).toFixed(2)} Cr`;
export const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function useIpl2027Desk(refetchInterval: number | false = false) {
  return useQuery<DeskSummary>({
    queryKey: ["ipl-2027-desk"],
    queryFn: async () => {
      const apiBase = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");
      const r = await fetch(`${apiBase}/auction-2027`);
      if (!r.ok) throw new Error(`ipl 2027 desk ${r.status}`);
      return r.json();
    },
    refetchInterval,
  });
}
