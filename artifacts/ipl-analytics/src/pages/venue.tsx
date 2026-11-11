import { useMemo } from "react";
import { Link, Redirect, useRoute } from "wouter";
import { MapPin } from "lucide-react";
import { Layout } from "@/components/layout";
import { VenueStadiumDashboard, type VenueSummary } from "@/components/venue-stadium-dashboard";
import { normalizeVenueName, useMatches, useVenues, venueHref, venueSlug, type VenueRow } from "@/lib/aggregates";

export default function VenueProfilePage() {
  const [, params] = useRoute("/venues/:slug");
  const slug = params?.slug ?? "";
  const venues = useVenues();
  const matches = useMatches();
  const summary = useMemo<VenueSummary | null>(() => {
    const wanted = venueSlug(slug.replace(/-/g, " "));
    const group = (venues.data ?? []).filter(v => venueSlug(v.venue) === wanted);
    if (!group.length) return null;
    const weighted = (field: keyof VenueRow) => {
      const valid = group.filter(v => typeof v[field] === "number" && Number.isFinite(v[field]));
      const count = valid.reduce((n, v) => n + (Number(v.matches) || 0), 0);
      return count ? valid.reduce((sum, v) => sum + Number(v[field]) * v.matches, 0) / count : undefined;
    };
    return {
      venue: normalizeVenueName(group[0].venue),
      city: (group.find(v => (v as VenueRow & { city?: string }).city) as VenueRow & { city?: string } | undefined)?.city,
      matches: group.reduce((n, v) => n + (Number(v.matches) || 0), 0),
      avg1stInn: weighted("avg1stInn"), avg2ndInn: weighted("avg2ndInn"),
      battingFirstWinPct: weighted("battingFirstWinPct"), chasingWinPct: weighted("chasingWinPct"),
      tossDecisionFieldPct: weighted("tossDecisionFieldPct"),
    };
  }, [venues.data, slug]);
  const venueMatches = useMemo(() => (matches.data ?? [])
    .filter(m => summary && venueSlug(m.venue) === venueSlug(summary.venue))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [matches.data, summary]);
  if (summary && slug !== venueSlug(summary.venue)) return <Redirect to={venueHref(summary.venue)} />;
  return <Layout hideRightPanel>{summary ? <VenueStadiumDashboard key={summary.venue} summary={summary} matches={venueMatches} /> : <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
    <MapPin className="w-10 h-10 text-sky-300/60" />
    <h1 className="text-xl font-black text-white">{venues.isLoading ? "Loading venue intelligence…" : venues.isError ? "Venue data could not load" : "Venue not found"}</h1>
    {venues.isError && <button className="text-sm text-sky-300" onClick={() => venues.refetch()}>Try again</button>}
    <Link href="/feed/venues" className="rounded-lg border border-white/15 px-4 py-2 text-sm text-sky-200">Explore the venue hub</Link>
  </div>}</Layout>;
}
