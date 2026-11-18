"""
Master IPL Stats Recalculation - FINAL
Fixes:
  1. Excludes Super Over innings from all career/season stats
  2. Proper innings counting (per actual at-bat, not inning-slots)
  3. Not-outs tracked -> correct avg = runs / (innings - not_outs)
  4. No wide double-counting (runs.batter is always 0 on wides per Cricsheet spec)
  5. Saves all 6 datasets + syncs to api-server & node_modules
  6. Matches = appearances in the playing XI (info.players, incl. impact subs), not innings batted/bowled
  7. Season = year of the first match date ("2020/21" is IPL 2020, not 2021)
  8. highestNotOut flags a not-out highest score
  9. One player = one Cricsheet registry id, shown under their latest name (e.g. "NA Saini" -> "Navdeep Saini");
     different players sharing a name are kept apart with " (2)"
"""

import os, json, shutil, sys
from collections import defaultdict

ROOT       = r'c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine'
RAW_DIR    = os.path.join(ROOT, 'lib', 'cricket-data', 'raw')
PUBLIC_DIR = os.path.join(ROOT, 'artifacts', 'ipl-analytics', 'public', 'data')
API_DIR    = os.path.join(ROOT, 'artifacts', 'api-server', 'data')
NODE_DIR   = os.path.join(ROOT, 'node_modules', '@workspace', 'ipl-analytics', 'public', 'data')

TEAM_MAP = {
    'royal challengers bangalore':  'Royal Challengers Bengaluru',
    'royal challengers bengaluru':  'Royal Challengers Bengaluru',
    'chennai super kings':          'Chennai Super Kings',
    'mumbai indians':               'Mumbai Indians',
    'kolkata knight riders':        'Kolkata Knight Riders',
    'sunrisers hyderabad':          'Sunrisers Hyderabad',
    'deccan chargers':              'Deccan Chargers',
    'delhi capitals':               'Delhi Capitals',
    'delhi daredevils':             'Delhi Capitals',
    'rajasthan royals':             'Rajasthan Royals',
    'kings xi punjab':              'Punjab Kings',
    'punjab kings':                 'Punjab Kings',
    'gujarat titans':               'Gujarat Titans',
    'lucknow super giants':         'Lucknow Super Giants',
    'rising pune supergiant':       'Rising Pune Supergiant',
    'rising pune supergiants':      'Rising Pune Supergiant',
    'pune warriors':                'Pune Warriors',
    'gujarat lions':                'Gujarat Lions',
    'kochi tuskers kerala':         'Kochi Tuskers Kerala',
}

def ct(t):
    if not t: return ''
    return TEAM_MAP.get(t.lower().strip(), t.strip())

def norm_s(s):
    if not s: return ''
    # Normalize season: "2007/08" -> "2008", "2009/10" -> "2010", "2020/21" -> "2020"
    s = str(s).strip()
    if '/' in s:
        parts = s.split('/')
        # Use the second part if it's a 2-digit year, convert to full year
        second = parts[1].strip()
        if len(second) == 2:
            century = parts[0][:2]
            return century + second
        else:
            return parts[1].strip()
    return s

latest_teams = {}
lt = os.path.join(PUBLIC_DIR, 'player-latest-teams.json')
if os.path.exists(lt):
    with open(lt, encoding='utf-8') as f:
        latest_teams = json.load(f)

def team_of(p):
    if p in latest_teams: return latest_teams[p]
    n = p.lower().replace('.','').replace('-',' ').strip()
    for k, v in latest_teams.items():
        if k.lower().replace('.','').replace('-',' ').strip() == n:
            return v
    return 'IPL'

def bat_rec(player, team='', season=''):
    return dict(player=player, team=team, season=season,
                matches=set(), innings=0, not_outs=0,
                runs=0, balls=0, fours=0, sixes=0, match_scores={}, match_not_out={},
                ppR=0, ppB=0, midR=0, midB=0, dR=0, dB=0)

def bowl_rec(player, team='', season=''):
    return dict(player=player, team=team, season=season,
                matches=set(), innings=0,
                runs=0, balls=0, wickets=0, dots=0, boundaries=0, fours=0, sixes=0,
                match_wickets={}, match_runs={},
                ppW=0, midW=0, deathW=0)

files = sorted(f for f in os.listdir(RAW_DIR) if f.endswith('.json'))
print(f'Processing {len(files)} files (Super Overs excluded)...')

# Cricsheet sometimes renames a player between seasons; the registry id is stable. Use the latest name everywhere.
_latest = {}
_apps = {}
for fname in files:
    try:
        with open(os.path.join(RAW_DIR, fname), encoding='utf-8') as f:
            _info = json.load(f).get('info', {})
    except Exception:
        continue
    _d = (_info.get('dates') or [''])[0]
    _reg = _info.get('registry', {}).get('people', {})
    for _n, _id in _reg.items():
        if _id not in _latest or _d >= _latest[_id][0]:
            _latest[_id] = (_d, _n)
    for _names in _info.get('players', {}).values():
        for _n in _names:
            _apps[_reg.get(_n)] = _apps.get(_reg.get(_n), 0) + 1
canonical_by_id = {k: v[1] for k, v in _latest.items()}
# Different players with the same name (e.g. two "Harmeet Singh"): the one with more matches keeps it, the others get " (2)"...
_by_name = {}
for _id, _n in canonical_by_id.items():
    _by_name.setdefault(_n, []).append(_id)
for _n, _ids in _by_name.items():
    if len(_ids) > 1:
        for _k, _id in enumerate(sorted(_ids, key=lambda i: -_apps.get(i, 0))[1:], start=2):
            canonical_by_id[_id] = f'{_n} ({_k})'
            print(f'  same name, different player: {_id} -> {canonical_by_id[_id]}')

# Playing-XI appearances: ('c', p) career, ('s', p, season), ('t', p, team), ('ts', p, team, season) -> match ids.
squads = {}
career_bat = {}; career_bowl  = {}
season_bat = {}; season_bowl  = {}
team_bat   = {}; team_bowl    = {}
ts_bat     = {}; ts_bowl      = {}

for fname in files:
    fpath = os.path.join(RAW_DIR, fname)
    try:
        with open(fpath, encoding='utf-8') as f:
            m = json.load(f)
        info = m.get('info', {})
        # IPL seasons sit inside one calendar year; Cricsheet labels IPL 2020 "2020/21", which norm_s maps to 2021.
        s = (info.get('dates') or [''])[0][:4] or norm_s(info.get('season', ''))
        m_id = fname.replace('.json', '')
        reg = info.get('registry', {}).get('people', {})
        canon = lambda n: canonical_by_id.get(reg.get(n), n) if n else n
        for sq_team, names in info.get('players', {}).items():
            sq_team = ct(sq_team)
            for pname in map(canon, names):
                for k in (('c', pname), ('s', pname, s), ('t', pname, sq_team), ('ts', pname, sq_team, s)):
                    squads.setdefault(k, set()).add(m_id)

        for inning in m.get('innings', []):
            if inning.get('super_over'):
                continue
            bat_team  = ct(inning.get('team', ''))
            bowl_team = ''
            teams_in_game = info.get('teams', [])
            if len(teams_in_game) == 2:
                t0 = ct(teams_in_game[0])
                t1 = ct(teams_in_game[1])
                bowl_team = t1 if bat_team == t0 else t0

            inn_bat  = {}
            inn_bowl = {}

            for over in inning.get('overs', []):
                on = over.get('over', 0)
                for d in over.get('deliveries', []):
                    b = canon(d.get('batter'))
                    w = canon(d.get('bowler'))
                    r = d.get('runs', {})
                    br = r.get('batter', 0)
                    tr = r.get('total', 0)
                    ext = d.get('extras', {})
                    wides = ext.get('wides', 0)
                    noballs = ext.get('noballs', 0)

                    r_bowl = br + wides + noballs
                    legal_bat  = (wides == 0)
                    legal_bowl = (wides == 0 and noballs == 0)

                    if b:
                        if b not in inn_bat:
                            inn_bat[b] = dict(runs=0,balls=0,fours=0,sixes=0,dismissed=False,
                                              ppR=0,ppB=0,midR=0,midB=0,dR=0,dB=0)
                        ib = inn_bat[b]
                        ib['runs'] += br
                        if legal_bat: ib['balls'] += 1
                        if br == 4: ib['fours'] += 1
                        if br == 6: ib['sixes'] += 1
                        if on < 6:
                            ib['ppR'] += br
                            if legal_bat: ib['ppB'] += 1
                        elif on < 15:
                            ib['midR'] += br
                            if legal_bat: ib['midB'] += 1
                        else:
                            ib['dR'] += br
                            if legal_bat: ib['dB'] += 1

                    if w:
                        if w not in inn_bowl:
                            inn_bowl[w] = dict(runs=0,balls=0,wickets=0,dots=0,boundaries=0,fours=0,sixes=0,ppW=0,midW=0,deathW=0)
                        wb = inn_bowl[w]
                        wb['runs'] += r_bowl
                        if legal_bowl: wb['balls'] += 1
                        if tr == 0 and legal_bowl: wb['dots'] += 1
                        if br in (4, 6):
                            wb['boundaries'] = wb.get('boundaries', 0) + 1
                            if br == 4: wb['fours'] = wb.get('fours', 0) + 1
                            if br == 6: wb['sixes'] = wb.get('sixes', 0) + 1

                    if d.get('wickets'):
                        for wk in d['wickets']:
                            pout = canon(wk.get('player_out'))
                            kind = wk.get('kind', '')
                            if pout and pout in inn_bat:
                                inn_bat[pout]['dismissed'] = True
                            if w and kind not in ('run out','retired hurt','retired out','obstructing the field'):
                                if w in inn_bowl:
                                    inn_bowl[w]['wickets'] += 1
                                    if on < 6:    inn_bowl[w]['ppW']    += 1
                                    elif on < 15: inn_bowl[w]['midW']   += 1
                                    else:         inn_bowl[w]['deathW'] += 1

            # Commit batter stats
            for b, ib in inn_bat.items():
                if ib['balls'] == 0 and ib['runs'] == 0:
                    continue
                for key, store in (
                    (b,                (career_bat, ''      , '')),
                    ((b,s),            (season_bat, ''      , s )),
                    ((b,bat_team),     (team_bat,   bat_team, '')),
                    ((b,bat_team,s),   (ts_bat,     bat_team, s )),
                ):
                    d_store, d_team, d_season = store
                    if key not in d_store:
                        d_store[key] = bat_rec(b, d_team, d_season)
                    r = d_store[key]
                    r['matches'].add(m_id)
                    r['innings']  += 1
                    if not ib['dismissed']:
                        r['not_outs'] += 1
                    r['runs']     += ib['runs']
                    r['balls']    += ib['balls']
                    r['fours']    += ib['fours']
                    r['sixes']    += ib['sixes']
                    r['match_scores'][m_id] = r['match_scores'].get(m_id, 0) + ib['runs']
                    r['match_not_out'][m_id] = not ib['dismissed']
                    r['ppR']  += ib['ppR'];  r['ppB']  += ib['ppB']
                    r['midR'] += ib['midR']; r['midB'] += ib['midB']
                    r['dR']   += ib['dR'];   r['dB']   += ib['dB']
                    r['team'] = bat_team
                    r['season'] = d_season

            # Commit bowler stats
            for w, wb in inn_bowl.items():
                for key, store in (
                    (w,                 (career_bowl, ''       , '')),
                    ((w,s),             (season_bowl, ''       , s )),
                    ((w,bowl_team),     (team_bowl,   bowl_team, '')),
                    ((w,bowl_team,s),   (ts_bowl,     bowl_team, s )),
                ):
                    d_store, d_team, d_season = store
                    if key not in d_store:
                        d_store[key] = bowl_rec(w, d_team, d_season)
                    r = d_store[key]
                    r['matches'].add(m_id)
                    r['innings']    += 1
                    r['runs']       += wb['runs']
                    r['balls']      += wb['balls']
                    r['wickets']    += wb['wickets']
                    r['dots']       += wb['dots']
                    r['boundaries'] += wb.get('boundaries', 0)
                    r['fours']      += wb.get('fours', 0)
                    r['sixes']      += wb.get('sixes', 0)
                    r['ppW']        += wb['ppW']
                    r['midW']       += wb['midW']
                    r['deathW']     += wb['deathW']
                    mw = wb['wickets']
                    if mw > 0:
                        r['match_wickets'][m_id] = r['match_wickets'].get(m_id,0) + mw
                    r['match_runs'][m_id] = r['match_runs'].get(m_id,0) + wb['runs']
                    r['team']   = d_team
                    r['season'] = d_season

    except Exception as e:
        print(f"Error in {fname}: {e}")

print(f'Batters: {len(career_bat)}, Bowlers: {len(career_bowl)}')

# Sanity check
anomalies = [(p, len(rec['matches']), rec['innings'])
             for p, rec in career_bat.items()
             if rec['innings'] > len(rec['matches'])]
anomalies.sort(key=lambda x: -(x[2]-x[1]))
print(f'Innings > Matches anomalies remaining: {len(anomalies)}')
for p, mc, ic in anomalies[:10]:
    print(f'  {p:<22s}  matches={mc}  innings={ic}')

def played(rec, sv=None, tv=None):
    """Matches in the playing XI for this record's scope; never fewer than the matches batted/bowled in."""
    p = rec['player']
    k = ('ts', p, tv, sv) if sv and tv else ('s', p, sv) if sv else ('t', p, tv) if tv else ('c', p)
    return len(squads.get(k, set()) | rec['matches'])

# Formatters
def fb(rec, sv=None, tv=None):
    runs  = rec['runs']
    balls = rec['balls']
    inn   = rec['innings']
    no    = rec['not_outs']
    dis   = inn - no
    avg   = round(runs/dis, 2) if dis > 0 else runs
    sr    = round(runs/balls*100, 2) if balls > 0 else 0.0
    ppSr  = round(rec['ppR']/rec['ppB']*100, 2) if rec.get('ppB',0)>0 else 0.0
    midSr = round(rec['midR']/rec['midB']*100, 2) if rec.get('midB',0)>0 else 0.0
    dSr   = round(rec['dR']/rec['dB']*100, 2) if rec.get('dB',0)>0 else 0.0
    scores= list(rec['match_scores'].values())
    f50   = sum(1 for sc in scores if 50 <= sc < 100)
    f100  = sum(1 for sc in scores if sc >= 100)
    hs    = max(scores) if scores else 0
    hs_no = any(rec['match_not_out'].get(mid) for mid, sc in rec['match_scores'].items() if sc == hs)
    bpct  = round((rec['fours']*4+rec['sixes']*6)/runs*100, 2) if runs>0 else 0.0
    team  = tv or rec.get('team') or team_of(rec['player'])
    out   = dict(player=rec['player'], team=team, teamName=team,
                 matches=played(rec, sv, tv), innings=inn, notOuts=no,
                 runs=runs, balls=balls, avg=avg, sr=sr,
                 fours=rec['fours'], sixes=rec['sixes'],
                 fifties=f50, hundreds=f100, highest=hs,
                 ppSr=ppSr, middleSr=midSr, deathSr=dSr, boundaryPct=bpct, highestNotOut=hs_no)
    if sv: out['season'] = sv
    return out

def fw(rec, sv=None, tv=None):
    runs   = rec['runs']
    balls  = rec['balls']
    wkts   = rec['wickets']
    ov     = balls/6.0
    econ   = round(runs/ov, 2) if ov > 0 else 0.0
    avg    = round(runs/wkts, 2) if wkts > 0 else 0.0
    sr     = round(balls/wkts, 2) if wkts > 0 else 0.0
    dot    = round(rec['dots']/balls*100, 2) if balls > 0 else 0.0
    bounds = rec.get('boundaries', 0)
    bpct   = round(bounds/balls*100, 2) if balls > 0 else 0.0
    bpb    = round(balls/bounds, 1) if bounds > 0 else 0.0
    team   = tv or rec.get('team') or team_of(rec['player'])
    bf = '0/0'; bw = -1; br_ = 999
    for mid, mw in rec['match_wickets'].items():
        mr = rec['match_runs'].get(mid,0)
        if mw > bw or (mw==bw and mr<br_):
            bw=mw; br_=mr; bf=f'{mw}/{mr}'
    fW = sum(1 for mw in rec['match_wickets'].values() if mw==4)
    vW = sum(1 for mw in rec['match_wickets'].values() if mw>=5)
    out = dict(player=rec['player'], team=team, teamName=team,
               matches=played(rec, sv, tv), innings=rec['innings'],
               overs=f"{balls//6}.{balls%6}", balls=balls, runs=runs, wickets=wkts,
               econ=econ, avg=avg, sr=sr, fourW=fW, fiveW=vW, best=bf,
               dots=rec['dots'], dotPct=dot,
               boundaries=bounds, fours=rec.get('fours', 0), sixes=rec.get('sixes', 0),
               boundaryPct=bpct, ballsPerBoundary=bpb,
               trueEconomy=round(econ-8.2,2),
               ppWickets=rec.get('ppW',0), middleWickets=rec.get('midW',0),
               deathWickets=rec.get('deathW',0))
    if sv: out['season'] = sv
    return out

print('Building datasets...')

# Hand-entered rows that differ from the Cricsheet data (scripts/stats-overrides.json). Applied, and listed, so they
# are never lost silently on a rerun -- and never mistaken for generated numbers.
OVR_PATH = os.path.join(ROOT, 'scripts', 'stats-overrides.json')
OVR = json.load(open(OVR_PATH, encoding='utf-8'))['overrides'] if os.path.exists(OVR_PATH) else {}
def apply_overrides(rows, fname, sec):
    key = lambda r: (r['player'], r['team'], r.get('season', ''))
    idx = {key(r): r for r in rows}
    for o in OVR.get(fname, {}).get(sec, []):
        src = o['row']
        r = idx.get(key(src))
        if r is None:
            rows.append(dict(src)); print(f'  override (added row) {fname} {sec} {key(src)}'); continue
        for fld in o['fields']:
            if fld in src: r[fld] = src[fld]
            else: r.pop(fld, None)
        if r['innings'] > r['matches']: r['matches'] = src['matches']  # the override's own sample
        print(f'  override {fname} {sec} {key(src)}: {", ".join(o["fields"])}')
    return rows

cb  = sorted(apply_overrides([fb(r) for r in career_bat.values()], 'player-career-stats.json', 'batters'),  key=lambda x: -x['runs'])
cbl = sorted(apply_overrides([fw(r) for r in career_bowl.values()], 'player-career-stats.json', 'bowlers'), key=lambda x: -x['wickets'])

with open(os.path.join(PUBLIC_DIR,'player-career-stats.json'),'w',encoding='utf-8') as f:
    json.dump({'batters':cb,'bowlers':cbl}, f, indent=2)

with open(os.path.join(PUBLIC_DIR,'top-batters.json'),'w',encoding='utf-8') as f:
    json.dump({'runs':cb,'sr':sorted(cb,key=lambda x:-x['sr']),'avg':sorted(cb,key=lambda x:-x['avg']),
               'sixes':sorted(cb,key=lambda x:-x['sixes']),'fours':sorted(cb,key=lambda x:-x['fours']),
               'hundreds':sorted(cb,key=lambda x:-x['hundreds'])}, f, indent=2)

with open(os.path.join(PUBLIC_DIR,'top-bowlers.json'),'w',encoding='utf-8') as f:
    json.dump({'wickets':cbl,'econ':sorted(cbl,key=lambda x:x['econ']),
               'avg':sorted(cbl,key=lambda x:(x['avg'] if x['avg']>0 else 999)),'death':cbl}, f, indent=2)

sb  = sorted(apply_overrides([fb(r,sv=r.get('season','')) for r in season_bat.values()], 'player-season-stats.json', 'batters'),  key=lambda x:(x.get('season',''),-x['runs']))
sbl = sorted(apply_overrides([fw(r,sv=r.get('season','')) for r in season_bowl.values()], 'player-season-stats.json', 'bowlers'), key=lambda x:(x.get('season',''),-x['wickets']))
with open(os.path.join(PUBLIC_DIR,'player-season-stats.json'),'w',encoding='utf-8') as f:
    json.dump({'batters':sb,'bowlers':sbl}, f, indent=2)

tb  = sorted(apply_overrides([fb(r,tv=r.get('team','')) for r in team_bat.values()], 'player-team-stats.json', 'batters'),  key=lambda x:(x['team'],-x['runs']))
tbl = sorted(apply_overrides([fw(r,tv=r.get('team','')) for r in team_bowl.values()], 'player-team-stats.json', 'bowlers'), key=lambda x:(x['team'],-x['wickets']))
with open(os.path.join(PUBLIC_DIR,'player-team-stats.json'),'w',encoding='utf-8') as f:
    json.dump({'batters':tb,'bowlers':tbl}, f, indent=2)

tsb  = sorted(apply_overrides([fb(r,sv=r.get('season',''),tv=r.get('team','')) for r in ts_bat.values()], 'player-team-season-stats.json', 'batters'),  key=lambda x:(x.get('season',''),x['team'],-x['runs']))
tsbl = sorted(apply_overrides([fw(r,sv=r.get('season',''),tv=r.get('team','')) for r in ts_bowl.values()], 'player-team-season-stats.json', 'bowlers'), key=lambda x:(x.get('season',''),x['team'],-x['wickets']))
with open(os.path.join(PUBLIC_DIR,'player-team-season-stats.json'),'w',encoding='utf-8') as f:
    json.dump({'batters':tsb,'bowlers':tsbl}, f, indent=2)

seasons_all = sorted(set(r.get('season','') for r in sb if r.get('season')))
st = {}
for sv in seasons_all:
    st[sv] = {'topBatters':[b for b in sb if b.get('season')==sv][:10],
              'topBowlers':[w for w in sbl if w.get('season')==sv][:10]}
with open(os.path.join(PUBLIC_DIR,'season-tops.json'),'w',encoding='utf-8') as f:
    json.dump(st, f, indent=2)

os.makedirs(API_DIR,  exist_ok=True)
os.makedirs(NODE_DIR, exist_ok=True)
fns = ['player-career-stats.json','top-batters.json','top-bowlers.json',
       'player-season-stats.json','player-team-stats.json',
       'player-team-season-stats.json','season-tops.json']
for fn in fns:
    src = os.path.join(PUBLIC_DIR, fn)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(API_DIR,  fn))
        shutil.copy(src, os.path.join(NODE_DIR, fn))

print('Synced all datasets.')

# Final verification
print('\nFinal verification vs ESPN/Cricbuzz:')
checks = [
    ('V Kohli',   'Virat Kohli',    9336, 275, 44),
    ('RG Sharma', 'Rohit Sharma',   7329, 276, 34),
    ('S Dhawan',  'Shikhar Dhawan', 6769, 221, 28),
    ('DA Warner', 'David Warner',   6565, 184, 22),
    ('KL Rahul',  'KL Rahul',       5815, 150, 18),
    ('SK Raina',  'Suresh Raina',   5528, 200, 31),
    ('CH Gayle',  'Chris Gayle',    4965, 140, 13),
]
print(f"{'Player':<20} {'Runs':>6} {'dRuns':>7} {'Inn':>5} {'dInn':>6} {'NO':>4} {'Avg':>7} {'ESPN_Avg':>9}")
print("-"*70)
for key, label, e_runs, e_inn, e_no in checks:
    rec = career_bat.get(key)
    if not rec:
        print(f"{label:<20}  NOT FOUND")
        continue
    r   = rec['runs']
    inn = rec['innings']
    no  = rec['not_outs']
    dis = inn - no
    avg = round(r/dis, 2) if dis > 0 else r
    e_avg = round(e_runs/(e_inn-e_no), 2) if (e_inn-e_no) > 0 else 0
    print(f"{label:<20} {r:>6}  {r-e_runs:>+6}  {inn:>5}  {inn-e_inn:>+5}  {no:>4}   {avg:>7}   {e_avg:>7}")

print('\nDONE.')
