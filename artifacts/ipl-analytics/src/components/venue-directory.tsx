import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { normalizeVenueName, useVenues, venueHref, venueImage, venueSlug } from "@/lib/aggregates";

/** Venue-specific navigation shared by the editorial hub and dedicated venue profiles. */
export function VenueDirectory() {
  const venues = useVenues();
  const params = new URLSearchParams(useSearch());
  const requested = params.get("venue") ?? "";
  const selectedSlug = venueSlug(requested.replace(/-/g, " "));
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const grounds = useMemo(() => {
    const grouped = new Map<string, { name: string; slug: string; matches: number }>();
    for (const row of venues.data ?? []) {
      const slug = venueSlug(row.venue);
      const ground = grouped.get(slug) ?? { name: normalizeVenueName(row.venue), slug, matches: 0 };
      ground.matches += Number(row.matches) || 0;
      grouped.set(slug, ground);
    }
    return [...grouped.values()].sort((a, b) => b.matches - a.matches);
  }, [venues.data]);
  const selected = grounds.find(g => g.slug === selectedSlug);
  const visible = grounds.filter(g => !search || `${g.name} ${g.slug}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="rounded-2xl border border-sky-400/25 bg-[#081321] p-4 sm:p-5 space-y-4" aria-label="Venue directory">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-widest text-sky-300">Venue intelligence</span><h2 className="text-xl font-black text-white">Explore a ground</h2><p className="text-xs text-white/55 mt-1">Open the same venue profile from match pages, Stats, Home or Tactics.</p></div><label className="flex items-center gap-2 border border-white/15 bg-black/20 px-3 py-2 rounded-lg"><Search size={14} className="text-white/40" /><input aria-label="Search venues" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a venue…" className="bg-transparent text-xs text-white outline-none w-36" /></label></div>
    {selected && <div className="rounded-xl border border-sky-300/30 bg-sky-400/5 p-3 flex flex-wrap items-center gap-3"><MapPin className="text-sky-300" size={20} /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-white">{selected.name}</p><span className="text-xs text-white/50">Selected venue · {selected.matches} historical matches</span></div><Link href={venueHref(selected.name)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-400/30 text-xs font-bold text-sky-200">Open full venue analysis <ArrowRight size={14} /></Link></div>}
    {venues.isLoading ? <p className="text-xs text-white/50">Loading grounds…</p> : venues.isError ? <button onClick={() => venues.refetch()} className="text-xs text-sky-200">Venue directory could not load. Try again.</button> : <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{(expanded || search ? visible : visible.slice(0, 12)).map(g => <Link key={g.slug} href={venueHref(g.name)} className={`group overflow-hidden rounded-xl border bg-black/15 hover:border-sky-300/60 transition-colors ${g.slug === selectedSlug ? "border-sky-300/60" : "border-white/10"}`}><div className="h-24 bg-slate-900 overflow-hidden">{venueImage(g.name) ? <img src={venueImage(g.name)!} alt="" loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div className="h-full grid place-items-center text-sky-300/40"><MapPin size={30} /></div>}</div><div className="p-3"><h3 className="text-xs font-bold text-white leading-snug">{g.name}</h3><div className="flex justify-between items-center gap-2 mt-2 text-[10px] text-white/45"><span>{g.matches} matches</span><ArrowRight size={12} className="text-sky-300" /></div></div></Link>)}</div>}
    {!venues.isLoading && !venues.isError && !visible.length && <p className="text-xs text-white/50">No matching venues.</p>}
    {grounds.length > 12 && !search && <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-sky-200">{expanded ? "Show fewer venues" : `View all ${grounds.length} venues`}</button>}
  </section>;
}
