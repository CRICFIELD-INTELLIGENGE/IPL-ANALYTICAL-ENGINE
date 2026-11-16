import React, { useState, useMemo, useRef, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Trophy, Flag, Shield, Flame, Target, Star, Calendar } from 'lucide-react';
import { buildGettyEditorialUrl } from '@/lib/getty-editorial-search';
import { PUBLIC_MANIFEST, isPublishable, isLocalPreviewable } from '@/lib/editorial-images';
import { EditorialImageFigure } from './dugout/editorial-image-figure';
import { PlayerAvatar } from '@/components/player-avatar';
import './dugout/franchise-milestones.css';

type Season = { season: string; runs?: number; wickets?: number };
const normalize = (value?: string | null) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const FILTERS = [
  { id: 'all', label: 'All milestones' },
  { id: 'matches', label: 'Centuries & spells' },
  { id: 'records', label: 'Career benchmarks' },
  { id: 'chapters', label: 'Chapters & teams' }
] as const;

type Filter = (typeof FILTERS)[number]['id'];

export interface PlayerMilestoneItem {
  id: string;
  season: string;
  value: string;
  title: string;
  label: string;
  description: string;
  kind: 'champion' | 'finalist' | 'record' | 'first';
  category: 'matches' | 'records' | 'chapters';
  date?: string;
  matchId?: string;
  opponent?: string;
  venue?: string;
  stats: { label: string; value: string }[];
}

export function PlayerCareerMilestones({
  name = 'Player',
  aliases = [],
  seasons = [],
  batting = true,
  accent = '#00D2FF',
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
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string>('');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const safeSeasons = Array.isArray(seasons) ? seasons : [];
  const valid = safeSeasons.filter(s => s && Number.isFinite(Number(s.season)) && Number.isFinite(batting ? s.runs : s.wickets));
  const best = [...valid].sort((a, b) => (batting ? (b.runs || 0) - (a.runs || 0) : (b.wickets || 0) - (a.wickets || 0)))[0];
  const first = [...valid].sort((a, b) => Number(a.season) - Number(b.season))[0];

  const moments = useMemo(() => {
    try {
      const list: PlayerMilestoneItem[] = [];

      // 1. First Recorded Season
      if (first && first.season) {
        list.push({
          id: 'first-season',
          season: String(first.season),
          value: String(first.season),
          title: 'IPL Debut Chapter',
          label: 'THE FIRST CHAPTER',
          description: `${name} made their recorded IPL debut in ${first.season}, establishing the foundation of an iconic tournament career.`,
          kind: 'first',
          category: 'chapters',
          stats: [
            { label: 'Debut Year', value: String(first.season) },
            { label: batting ? 'Debut Runs' : 'Debut Wickets', value: String(batting ? (first.runs ?? 0) : (first.wickets ?? 0)) },
            { label: 'Tournament', value: 'IPL' }
          ]
        });
      }

      // 2. Best Season
      if (best && best.season) {
        const peakVal = batting ? (best.runs ?? 0) : (best.wickets ?? 0);
        list.push({
          id: 'best-season',
          season: String(best.season),
          value: String(peakVal),
          title: `Peak Season Performance (${best.season})`,
          label: 'CAREER BENCHMARK',
          description: `Delivered a stellar campaign in ${best.season}, amassing ${peakVal} ${batting ? 'runs' : 'wickets'} at elite efficiency across the competition.`,
          kind: 'record',
          category: 'records',
          stats: [
            { label: batting ? 'Peak Runs' : 'Peak Wickets', value: String(peakVal) },
            { label: 'Season', value: String(best.season) },
            { label: 'Impact', value: 'All-Tournament' }
          ]
        });
      }

      // 3. Career Aggregates
      let cumulative = 0;
      const crossed = new Set<number>();
      for (const row of [...valid].sort((a, b) => Number(a.season) - Number(b.season))) {
        cumulative += Number(batting ? row.runs : row.wickets) || 0;
        for (const threshold of batting ? [1000, 3000, 5000, 7000] : [100, 150, 200]) {
          if (cumulative >= threshold && !crossed.has(threshold)) {
            crossed.add(threshold);
            list.push({
              id: `aggregate-${threshold}`,
              season: String(row.season),
              value: threshold.toLocaleString(),
              title: `${threshold.toLocaleString()} Career ${batting ? 'Runs' : 'Wickets'} Landmark`,
              label: 'CAREER MILESTONE',
              description: `Crossed the ${threshold.toLocaleString()} ${batting ? 'run' : 'wicket'} plateau during the ${row.season} season, joining an exclusive pantheon of IPL greats.`,
              kind: 'record',
              category: 'records',
              stats: [
                { label: 'Plateau', value: `${threshold}+` },
                { label: 'Season Achieved', value: String(row.season) },
                { label: 'Elite Tier', value: 'Top 5%' }
              ]
            });
          }
        }
      }

      // 4. Standout Match Performances
      const safeMatches = Array.isArray(matches) ? matches : [];
      const standout = [...safeMatches]
        .filter(m => m && ((m.batting?.runs ?? 0) >= 50 || (m.bowling?.wickets ?? 0) >= 4))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const seenMatches = new Set<string>();
      for (const match of standout) {
        if (!match || !match.matchId || seenMatches.has(match.matchId)) continue;
        seenMatches.add(match.matchId);
        const bat = match.batting;
        const bowl = match.bowling;
        const century = (bat?.runs ?? 0) >= 100;
        const spell = (bowl?.wickets ?? 0) >= 4;

        const sr = bat && bat.balls ? ((bat.runs / bat.balls) * 100).toFixed(1) : undefined;
        list.push({
          id: `match-${match.matchId}`,
          season: String(match.season || 'IPL'),
          date: match.date,
          matchId: match.matchId,
          opponent: match.vsTeam,
          venue: match.venue,
          value: century || !spell ? `${bat?.runs ?? 0}${bat?.notOut ? '*' : ''}` : `${bowl?.wickets ?? 0} Wkts`,
          title: century
            ? `Century against ${match.vsTeam || 'Opponent'}`
            : spell
            ? `Match-Winning Spell vs ${match.vsTeam || 'Opponent'}`
            : `Match-Defining 50 vs ${match.vsTeam || 'Opponent'}`,
          label: century ? 'CENTURIES' : spell ? 'BOWLING SPELLS' : 'SPECIAL INNINGS',
          description: `Delivered on ${match.date || 'Matchday'} at ${match.venue || 'Stadium'}. ${bat && bat.runs >= 50 ? `Blasted ${bat.runs}${bat.notOut ? ' not out' : ''} from ${bat.balls} balls. ` : ''}${spell ? `Took ${bowl?.wickets} key dismissals. ` : ''}${match.team || 'Team'} registered: ${match.result || 'Result'}.`,
          kind: century || spell ? 'champion' : 'record',
          category: 'matches',
          stats: [
            ...(bat ? [{ label: 'Runs Scored', value: `${bat.runs}${bat.notOut ? '*' : ''}` }] : []),
            ...(bat?.balls ? [{ label: 'Balls Faced', value: String(bat.balls) }] : []),
            ...(sr ? [{ label: 'Strike Rate', value: sr }] : []),
            ...(bowl ? [{ label: 'Wickets', value: String(bowl.wickets) }] : []),
            { label: 'Opponent', value: match.vsTeam || 'Opposition' }
          ]
        });
      }

      // 5. Leadership / Captaincy
      if (captaincy?.firstSeason) {
        list.push({
          id: 'captaincy-landmark',
          season: String(captaincy.firstSeason),
          value: String(captaincy.firstSeason),
          title: 'Franchise Leadership & Captaincy',
          label: 'LEADERSHIP ARCHIVE',
          description: `Commanded franchise leadership starting in ${captaincy.firstSeason}.${captaincy.titles ? ` Led team to ${captaincy.titles} IPL championship victory.` : ' Commanded high-intensity tactical strategy on the field.'}`,
          kind: captaincy.titles ? 'champion' : 'record',
          category: 'chapters',
          stats: [
            { label: 'Captain Since', value: String(captaincy.firstSeason) },
            { label: 'Titles Won', value: String(captaincy.titles || 0) },
            { label: 'Leadership', value: 'Captain' }
          ]
        });
      }

      // 6. Longevity
      const distinctYears = [...new Set(valid.map(r => r.season).filter(Boolean))].sort();
      if (distinctYears.length >= 10) {
        list.push({
          id: 'longevity-10',
          season: String(distinctYears[distinctYears.length - 1]),
          value: `${distinctYears.length} Yrs`,
          title: `${distinctYears.length} IPL Seasons Completed`,
          label: 'LONGEVITY & SUSTAINED EXCELLENCE',
          description: `Maintained top-tier competitiveness across ${distinctYears.length} distinct IPL editions, anchoring franchise consistency.`,
          kind: 'record',
          category: 'records',
          stats: [
            { label: 'Total Seasons', value: String(distinctYears.length) },
            { label: 'Debut', value: String(distinctYears[0]) },
            { label: 'Latest', value: String(distinctYears[distinctYears.length - 1]) }
          ]
        });
      }

      return list.sort((a, b) => Number(Boolean(b.matchId)) - Number(Boolean(a.matchId)) || (b.date ?? b.season).localeCompare(a.date ?? a.season));
    } catch (err) {
      console.error("PlayerCareerMilestones generation error:", err);
      return [];
    }
  }, [name, valid, best, first, matches, captaincy, batting]);

  const visible = useMemo(() => {
    if (filter === 'all') return moments;
    return moments.filter(m => m.category === filter);
  }, [moments, filter]);

  const names = useMemo(() => [name, ...(Array.isArray(aliases) ? aliases : [])].filter(Boolean).map(normalize), [name, aliases]);

  const selectedIndex = useMemo(() => {
    if (!visible.length) return 0;
    const found = visible.findIndex(m => m.id === selectedId);
    if (found >= 0) return found;
    // Default to first moment that matches an exact match date in Getty manifest
    const firstWithPhoto = visible.findIndex(m => {
      if (m.date && PUBLIC_MANIFEST && Array.isArray(PUBLIC_MANIFEST.images)) {
        return PUBLIC_MANIFEST.images.some(img => img.matchDate === m.date && (isPublishable(img) || isLocalPreviewable(img)));
      }
      return false;
    });
    return firstWithPhoto >= 0 ? firstWithPhoto : 0;
  }, [visible, selectedId]);

  const moment = visible[selectedIndex];

  const choose = (index: number, focus = false) => {
    if (!visible.length) return;
    const next = Math.max(0, Math.min(visible.length - 1, index));
    setSelectedId(visible[next].id);
    if (focus) tabRefs.current[next]?.focus();
  };

  // Color styling matching franchise-milestones palette
  const cleanAccent = (typeof accent === "string" && accent.startsWith("#") ? accent : "#00D2FF");
  const hexClean = cleanAccent.replace(/[^0-9a-fA-F]/g, "");
  const rgb: [number, number, number] = hexClean.length >= 6
    ? [
        parseInt(hexClean.slice(0, 2), 16) / 255,
        parseInt(hexClean.slice(2, 4), 16) / 255,
        parseInt(hexClean.slice(4, 6), 16) / 255,
      ]
    : [0, 0.8, 1];
  const [red, green, blue] = rgb.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const onAccent = 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179 ? '#142029' : '#ffffff';

  const style = {
    '--fm-accent': cleanAccent,
    '--fm-secondary': cleanAccent,
    '--fm-on-accent': onAccent,
  } as CSSProperties;

  // Find matching Getty editorial photograph with robust cascade:
  // 1. Exact match date -> 2. Match season -> 3. Match opponent -> 4. Player landmark/celebration fallback
  const photo = useMemo(() => {
    if (!moment || !PUBLIC_MANIFEST || !Array.isArray(PUBLIC_MANIFEST.images)) return undefined;

    // Helper to verify if an image depicts or references the player
    const isPlayerImage = (image: any) => {
      if (!image || image.source !== 'getty') return false;
      if (!image.discovery?.captionVerified) return false;
      if (!isPublishable(image) && !isLocalPreviewable(image)) return false;
      const cap = typeof image.caption === 'string' ? image.caption.toLowerCase() : '';
      const depictsMatch = Array.isArray(image.depicts) && image.depicts.some((person: string) => person && names.includes(normalize(person)));
      const captionMatch = [name, ...(Array.isArray(aliases) ? aliases : [])]
        .filter(n => n && n.trim().split(/\s+/).every(part => part.length > 1))
        .some(n => cap.includes(n.toLowerCase()));
      return depictsMatch || captionMatch;
    };

    // 1. Exact match by date
    if (moment.date) {
      const exact = PUBLIC_MANIFEST.images.find(image => isPlayerImage(image) && image.matchDate === moment.date);
      if (exact) return exact;
    }

    // 2. Exact match by season
    if (moment.season) {
      const seasonMatch = PUBLIC_MANIFEST.images.find(image => isPlayerImage(image) && image.matchDate?.startsWith(moment.season + '-'));
      if (seasonMatch) return seasonMatch;
    }

    // 3. Match against opponent
    if (moment.opponent) {
      const oppClean = moment.opponent.toLowerCase();
      const oppMatch = PUBLIC_MANIFEST.images.find(image => {
        if (!isPlayerImage(image)) return false;
        const cap = typeof image.caption === 'string' ? image.caption.toLowerCase() : '';
        return cap.includes(oppClean);
      });
      if (oppMatch) return oppMatch;
    }

    // 4. Milestone celebration or iconic match action editorial fallback
    return PUBLIC_MANIFEST.images.find(image => {
      if (!isPlayerImage(image)) return false;
      const cap = typeof image.caption === 'string' ? image.caption.toLowerCase() : '';
      return cap.includes('celebrat') || cap.includes('century') || cap.includes('fifty') || cap.includes('shot') || cap.includes('bat');
    }) || PUBLIC_MANIFEST.images.find(image => isPlayerImage(image));
  }, [moment, name, aliases, names]);

  if (!moment) {
    return (
      <section className="franchise-milestones lg:col-span-3" style={style}>
        <div className="fm-empty">
          <Flag size={28} />
          <h3>No recorded moments in this category yet.</h3>
          <p>Career milestones and historical match performances will appear as data is verified.</p>
          <button onClick={() => setFilter('all')}>
            Explore all milestones <ArrowRight size={14} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="franchise-milestones lg:col-span-3"
      id="milestones"
      style={style}
      aria-label={`${name} career milestones`}
    >
      {/* 1. Header (Franchise-Milestone Style) */}
      <header className="fm-header">
        <div>
          <span>THE MOMENTS THAT DEFINED A CAREER</span>
          <h2>
            {name} <em>MILESTONES</em>
          </h2>
        </div>
        <div className="fm-header-identity">
          <PlayerAvatar name={name} className="w-11 h-11 rounded-xl border border-white/20" />
          <span>
            {name}
            <small>Career Landmarks &amp; Verified Match Archive</small>
          </span>
        </div>
      </header>

      {/* 2. Toolbar & Filters */}
      <div className="fm-toolbar">
        <div aria-label="Milestone categories" className="fm-filters">
          {FILTERS.map(f => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              className={filter === f.id ? 'active' : ''}
              onClick={() => {
                setFilter(f.id);
                setSelectedId('');
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span>{visible.length} recorded landmarks</span>
      </div>

      {/* 3. Feature Showcase Panel */}
      <div className="fm-feature" role="tabpanel" id={`milestone-panel-${moment.id}`}>
        {/* Slanted Year Badge Rule */}
        <div className="fm-top-rule">
          <span className="fm-year-badge">
            IPL {moment.season ?? 'CAREER'}
            <i />
            <i />
          </span>
          <div />
          <span>
            {String(selectedIndex + 1).padStart(2, '0')} / {String(visible.length).padStart(2, '0')}
          </span>
        </div>

        {/* Feature Body */}
        <div className="fm-feature-body" key={moment.id}>
          {/* Left: Copy & Visual Stat Tiles */}
          <div className="fm-copy">
            <span className="fm-kicker">
              {moment.kind === 'champion' ? <Trophy size={13} /> : <Flag size={13} />}
              {moment.label}
            </span>

            <div className={`fm-value ${moment.value.length > 6 ? 'long' : ''}`}>
              {moment.value}
            </div>

            <h3>{moment.title}</h3>
            <div className="fm-copy-divider" />
            <p>{moment.description}</p>

            {/* Visual Stats Bar */}
            <div className="fm-stats">
              {moment.stats.map(stat => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Clean Actions */}
            <div className="fm-actions">
              {moment.matchId && (
                <Link href={`/scores?matchId=${moment.matchId}`}>
                  Open match scorecard <ArrowRight size={14} />
                </Link>
              )}
              {moment.opponent && (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-white/80">
                  <Shield size={12} className="text-primary" />
                  vs {moment.opponent}
                </span>
              )}
            </div>
          </div>

          {/* Right: Broadcast Stage / Photo Gallery */}
          <div className="fm-photo-panel">
            {photo ? (
              <EditorialImageFigure
                image={photo}
                fallback={<MilestoneStageCard moment={moment} name={name} accent={cleanAccent} />}
              />
            ) : (
              <MilestoneStageCard moment={moment} name={name} accent={cleanAccent} />
            )}
          </div>
        </div>
      </div>

      {/* 4. Controls Footer */}
      <footer className="fm-controls">
        <p aria-live="polite" aria-atomic="true">
          {moment.title}
          <small>
            {moment.label} · {selectedIndex + 1} of {visible.length}
          </small>
        </p>
        <div>
          <button
            aria-label="Previous landmark"
            disabled={selectedIndex === 0}
            onClick={() => choose(selectedIndex - 1)}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            aria-label="Next landmark"
            disabled={selectedIndex === visible.length - 1}
            onClick={() => choose(selectedIndex + 1)}
          >
            <ArrowRight size={19} />
          </button>
        </div>
      </footer>

      {/* 5. Horizontal Moment Buttons List */}
      <div
        className="fm-moment-list"
        role="tablist"
        aria-label={`${name} career milestones`}
        onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            choose(
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                ? visible.length - 1
                : selectedIndex + (event.key === 'ArrowRight' ? 1 : -1),
              true
            );
          }
        }}
      >
        {visible.map((m, index) => (
          <button
            ref={el => {
              tabRefs.current[index] = el;
            }}
            key={m.id}
            role="tab"
            id={`milestone-tab-${m.id}`}
            aria-controls={`milestone-panel-${m.id}`}
            aria-selected={index === selectedIndex}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => choose(index)}
            className={index === selectedIndex ? 'selected' : ''}
          >
            {m.kind === 'champion' ? <Trophy size={13} /> : <Flag size={13} />}
            <strong>{m.value}</strong>
            <span>{m.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Broadcast-grade visual stage card when no match photo is available */
function MilestoneStageCard({
  moment,
  name,
  accent,
}: {
  moment: PlayerMilestoneItem;
  name: string;
  accent: string;
}) {
  return (
    <div className="fm-artwork relative w-full h-full min-h-[360px] flex flex-col justify-between p-6 overflow-hidden">
      <div className="fm-artwork-lines" />
      <div className="fm-artwork-year">{moment.season}</div>
      <div className="fm-artwork-shade" />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <span className="fm-artwork-stamp">
          VERIFIED RECORD
          <small>IPL ARCHIVE</small>
        </span>
        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-white/10 backdrop-blur-md border border-white/15 text-white">
          IPL {moment.season}
        </span>
      </div>

      {/* Center Crest / Avatar */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="fm-crest">
          <PlayerAvatar name={name} framing="chest" className="w-24 h-24 text-2xl rounded-full shadow-2xl overflow-hidden" />
          <div className="fm-trophy">
            <Trophy size={20} />
          </div>
        </div>
      </div>

      {/* Bottom Caption */}
      <div className="fm-artwork-caption">
        <span className="text-sm font-black text-white block">{moment.title}</span>
        {moment.opponent && (
          <small className="text-white/70">
            vs {moment.opponent} {moment.venue ? `· ${moment.venue}` : ''}
          </small>
        )}
      </div>
    </div>
  );
}
