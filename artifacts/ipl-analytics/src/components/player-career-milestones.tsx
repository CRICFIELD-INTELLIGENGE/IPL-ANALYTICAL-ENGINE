import { buildGettyEditorialUrl } from '@/lib/getty-editorial-search';
import { useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Trophy, Flag, ChevronDown, ChevronUp, Calendar, MapPin, Shield } from 'lucide-react';
import { PUBLIC_MANIFEST, isPublishable, isLocalPreviewable } from '@/lib/editorial-images';
import { EditorialImageFigure } from './dugout/editorial-image-figure';
import './dugout/franchise-milestones.css';

type Season = { season: string; runs?: number; wickets?: number };
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function PlayerCareerMilestones({
  name,
  aliases = [],
  seasons,
  batting,
  accent,
  history = [],
  captaincy,
  matches = []
}: {
  name: string;
  aliases?: string[];
  seasons: Season[];
  batting: boolean;
  accent?: string;
  history?: { season: string; team: string; priceDisplay?: string | null }[];
  captaincy?: { firstSeason?: number | null; titles?: number | null } | null;
  matches?: {
    matchId: string;
    date: string;
    season: string;
    team: string;
    vsTeam: string;
    venue: string;
    result: string;
    batting?: { runs: number; balls: number; notOut?: boolean } | null;
    bowling?: { wickets: number; runs?: number } | null;
  }[];
}) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const valid = seasons.filter(s => Number.isFinite(Number(s.season)) && Number.isFinite(batting ? s.runs : s.wickets));
  const best = [...valid].sort((a, b) => (batting ? b.runs! - a.runs! : b.wickets! - a.wickets!))[0];
  const first = [...valid].sort((a, b) => Number(a.season) - Number(b.season))[0];

  const moments: {
    id: string;
    season: string;
    value: string;
    title: string;
    label: string;
    description: string;
    date?: string;
    matchId?: string;
    opponent?: string;
    venue?: string;
    featured?: boolean;
  }[] = [
    ...(first ? [{ id: 'first', season: first.season, value: first.season, title: 'The first recorded season', label: 'THE FIRST CHAPTER', description: `${name}’s earliest IPL season in the available ${batting ? 'batting' : 'bowling'} archive.`, featured: true }] : []),
    ...(best ? [{ id: 'best', season: best.season, value: String(batting ? best.runs : best.wickets), title: `Most ${batting ? 'runs' : 'wickets'} in a recorded season`, label: 'A CAREER LANDMARK', description: `${batting ? best.runs : best.wickets} ${batting ? 'runs' : 'wickets'} in ${best.season}. A season aggregate, not a single-match performance.`, featured: true }] : [])
  ];

  let cumulative = 0;
  const crossed = new Set<number>();
  for (const row of [...valid].sort((a, b) => Number(a.season) - Number(b.season))) {
    cumulative += Number(batting ? row.runs : row.wickets);
    for (const threshold of batting ? [1000, 3000, 5000, 7000] : [100, 150, 200]) {
      if (cumulative >= threshold && !crossed.has(threshold)) {
        crossed.add(threshold);
        moments.push({
          id: `aggregate-${threshold}`,
          season: row.season,
          value: String(threshold),
          title: `${threshold.toLocaleString()} career ${batting ? 'runs' : 'wickets'} reached`,
          label: 'CAREER AGGREGATES',
          description: `The available season totals reach this threshold by the end of ${row.season}. Exact crossing match is not established by season aggregates.`,
          featured: threshold >= 5000 || threshold === 150
        });
      }
    }
  }

  const years = [...new Set(valid.map(r => r.season))].sort();
  for (const threshold of [10, 15, 18]) {
    if (years.length >= threshold) {
      moments.push({
        id: `longevity-${threshold}`,
        season: years[threshold - 1],
        value: String(threshold),
        title: `${threshold} recorded IPL seasons`,
        label: 'LONGEVITY',
        description: `Participation recorded in ${threshold} distinct seasons. This does not assert consecutive appearances.`
      });
    }
  }

  const ordered = [...history].sort((a, b) => Number(a.season) - Number(b.season));
  ordered.forEach((row, i) => {
    if (i && row.team !== ordered[i - 1].team) {
      moments.push({
        id: `move-${i}`,
        season: row.season,
        value: row.season,
        title: `${ordered[i - 1].team} → ${row.team}`,
        label: 'FRANCHISE TRANSITIONS',
        description: `Squad records place ${name} with ${row.team} in ${row.season}, following ${ordered[i - 1].team}. ${row.priceDisplay ? `Recorded acquisition price: ${row.priceDisplay}.` : ''}`
      });
    }
  });

  if (captaincy?.firstSeason) {
    moments.push({
      id: 'captain',
      season: String(captaincy.firstSeason),
      value: String(captaincy.firstSeason),
      title: 'First recorded captaincy season',
      label: 'LEADERSHIP',
      description: `Captaincy archive begins in ${captaincy.firstSeason}.${captaincy.titles ? ` ${captaincy.titles} title victories are recorded across the captaincy career.` : ''} Exact first fixture is not established here.`,
      featured: true
    });
  }

  const standout = [...matches]
    .filter(m => (m.batting?.runs ?? 0) >= 50 || (m.bowling?.wickets ?? 0) >= 4)
    .sort((a, b) => a.date.localeCompare(b.date));

  const seen = new Set<string>();
  for (const match of standout) {
    if (seen.has(match.matchId)) continue;
    seen.add(match.matchId);
    const bat = match.batting;
    const bowl = match.bowling;
    const century = (bat?.runs ?? 0) >= 100;
    const spell = (bowl?.wickets ?? 0) >= 4;

    moments.push({
      id: `match-${match.matchId}`,
      season: match.season,
      date: match.date,
      matchId: match.matchId,
      opponent: match.vsTeam,
      venue: match.venue,
      value: century || !spell ? `${bat?.runs}${bat?.notOut ? '*' : ''}` : `${bowl?.wickets} wickets`,
      title: century ? `Century against ${match.vsTeam}` : spell ? `Standout spell against ${match.vsTeam}` : `Half-century against ${match.vsTeam}`,
      label: century ? 'CENTURIES' : spell ? 'BOWLING SPELLS' : 'SPECIAL INNINGS',
      description: `${match.date} · ${match.venue}. ${bat && bat.runs >= 50 ? `${bat.runs}${bat.notOut ? ' not out' : ''} from ${bat.balls} balls. ` : ''}${spell ? `${bowl?.wickets} wickets. ` : ''}${match.team}: ${match.result}. Recorded performance; match impact is not inferred from the score alone.`,
      featured: century || spell
    });
  }

  moments.sort((a, b) => Number(Boolean(b.matchId)) - Number(Boolean(a.matchId)) || (b.date ?? b.season).localeCompare(a.date ?? a.season));

  const [category, setCategory] = useState('All');
  const categories = ['All', 'CENTURIES', 'SPECIAL INNINGS', 'BOWLING SPELLS', 'THE FIRST CHAPTER', 'A CAREER LANDMARK', 'CAREER AGGREGATES', 'LONGEVITY', 'LEADERSHIP', 'FRANCHISE TRANSITIONS'];
  const visible = moments.filter(m => category === 'All' || m.label === category);
  const moment = visible[Math.min(selected, visible.length - 1)];

  if (!moment) {
    return (
      <section className="franchise-milestones lg:col-span-3 rounded-2xl border border-white/10 bg-[#0B1220] p-6 text-center text-white/50">
        <h2 className="text-base font-bold text-white mb-2">Player Milestones</h2>
        <p className="text-xs">No verified season records are available for this player yet.</p>
      </section>
    );
  }

  const names = [name, ...aliases].filter(Boolean).map(normalize);
  const photo = PUBLIC_MANIFEST.images.find(image =>
    image.source === 'getty' &&
    (moment.date ? image.matchDate === moment.date : image.matchDate?.startsWith(moment.season + '-')) &&
    image.discovery?.captionVerified &&
    (image.depicts?.some(person => names.includes(normalize(person))) ||
      [name, ...aliases].filter(n => n && n.trim().split(/\s+/).every(part => part.length > 1)).some(n => image.caption.toLowerCase().includes(n.toLowerCase()))) &&
    (isPublishable(image) || isLocalPreviewable(image))
  );

  // Styled scorecard fallback so we never render a blank/empty panel
  const fallback = (
    <div className="w-full h-full min-h-[220px] rounded-xl bg-gradient-to-br from-[#0c1629] via-[#08101e] to-[#040810] border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-10" style={{ backgroundColor: accent || '#00D2FF' }} />
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">Milestone Telemetry</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-white/80">IPL {moment.season}</span>
      </div>

      <div className="my-3 z-10">
        <div className="text-3xl font-black font-display text-white tracking-tight leading-none" style={{ color: accent || '#00D2FF' }}>
          {moment.value}
        </div>
        <div className="text-sm font-bold text-white mt-1">{moment.title}</div>
        {moment.opponent && (
          <div className="text-xs text-white/60 flex items-center gap-1.5 mt-1">
            <span>vs {moment.opponent}</span>
            {moment.venue && <span>· {moment.venue}</span>}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40 z-10">
        <span>Verified IPL Performance</span>
        <a
          href={buildGettyEditorialUrl({ playerName: name, year: moment.season, date: moment.date, opponent: moment.opponent, venue: moment.venue, eventType: moment.id === 'first' ? 'debut' : 'match_performance' })}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Getty Archives ↗
        </a>
      </div>
    </div>
  );

  // Top 3 featured milestones
  const featuredMoments = moments.slice(0, 3);

  return (
    <section
      style={{ '--fm-accent': accent ?? '#00D2FF', '--fm-secondary': accent ?? '#00D2FF' } as CSSProperties}
      className="franchise-milestones lg:col-span-3 rounded-2xl border border-white/10 bg-[#070D1A] p-5 sm:p-6 shadow-xl space-y-5"
      aria-label={`${name} career milestones`}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            CAREER MILESTONES &amp; HISTORICAL ARCHIVE
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5">
            Key Landmarks · {name}
          </h2>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.filter(c => c === 'All' || moments.some(m => m.label === c)).slice(0, 5).map(c => (
            <button
              key={c}
              onClick={() => { setCategory(c); setSelected(0); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                category === c ? 'bg-primary text-white shadow-sm' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {c === 'All' ? 'All Milestones' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Featured 3 Cards (Compact View) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {featuredMoments.map((m, idx) => {
          const isCurr = visible[selected]?.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                const targetIdx = visible.findIndex(v => v.id === m.id);
                if (targetIdx !== -1) setSelected(targetIdx);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isCurr
                  ? 'border-primary bg-primary/10 shadow-md'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-white/50 mb-1">
                <span>{m.label}</span>
                <span className="font-bold text-white/80">IPL {m.season}</span>
              </div>
              <div className="text-xl font-black font-display text-white" style={{ color: isCurr ? (accent || '#00D2FF') : undefined }}>
                {m.value}
              </div>
              <div className="text-xs font-bold text-white/90 line-clamp-1 mt-1">{m.title}</div>
            </button>
          );
        })}
      </div>

      {/* Main Showcase Panel (Compact & Responsive) */}
      <div className="rounded-xl border border-white/10 bg-[#0B1426] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-7 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
              <Flag className="w-3 h-3" />
              {moment.label}
            </span>
            <span className="text-[10px] font-mono text-white/40">IPL {moment.season}</span>
            <span className="text-[10px] font-mono text-white/30">({selected + 1} of {visible.length})</span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight" style={{ color: accent || '#00D2FF' }}>
              {moment.value}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">{moment.title}</h3>
          </div>

          <p className="text-xs text-white/70 leading-relaxed max-w-xl">{moment.description}</p>

          <div className="flex items-center gap-2 pt-2">
            <button
              aria-label="Previous player milestone"
              disabled={selected === 0}
              onClick={() => setSelected(i => Math.max(0, i - 1))}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              aria-label="Next player milestone"
              disabled={selected >= visible.length - 1}
              onClick={() => setSelected(i => Math.min(visible.length - 1, i + 1))}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            {moment.matchId && (
              <a href={`/scores?matchId=${moment.matchId}`} className="text-xs font-bold text-primary hover:underline ml-2">
                Open Scorecard →
              </a>
            )}
          </div>
        </div>

        <div className="md:col-span-5 h-full min-h-[190px] flex items-center justify-center">
          {photo ? <EditorialImageFigure image={photo} fallback={fallback} /> : fallback}
        </div>
      </div>

      {/* Expand Full Timeline Button */}
      <div className="pt-2 flex flex-col items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
        >
          <span>{expanded ? 'Collapse Timeline' : `Expand Complete Timeline (${visible.length} Milestones)`}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-300">
            {visible.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setSelected(i)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  i === selected
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-white/40 mb-1">
                  <span>{m.label}</span>
                  <span>{m.season}</span>
                </div>
                <div className="font-bold text-xs text-white truncate">{m.title}</div>
                <div className="text-[10px] font-mono font-black text-primary mt-1">{m.value}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
