"""
Find the exact Cricsheet data errors causing Kohli overcount vs ESPN/Cricbuzz.
Checks:
  1. Wide deliveries where runs.batter > 0 (should always be 0 on wides)
  2. Super Over deliveries included in career stats (should be excluded)
  3. Match-type issues (non-IPL games tagged as IPL)
"""
import os, json
from collections import defaultdict

RAW_DIR = r'c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\lib\cricket-data\raw'

files = sorted(f for f in os.listdir(RAW_DIR) if f.endswith('.json'))

kohli_bad_wides   = []  # wide deliveries with batter runs > 0
kohli_superover   = []  # super-over deliveries
kohli_match_types = []  # any non-IPL match type

total_runs = 0
total_wide_batter_runs = 0
total_superover_runs = 0

for fname in files:
    fpath = os.path.join(RAW_DIR, fname)
    try:
        with open(fpath, encoding='utf-8') as f:
            m = json.load(f)
    except Exception:
        continue

    info = m.get('info', {})
    dates   = info.get('dates', ['?'])
    season  = info.get('season', '?')
    match_type = info.get('match_type', '')
    event = info.get('event', {})
    event_name = event.get('name', '') if isinstance(event, dict) else str(event)
    is_superover_match = False

    for inn_idx, inn in enumerate(m.get('innings', [])):
        is_superover_inn = bool(inn.get('super_over') or 'super over' in str(inn.get('team','')).lower())

        for over in inn.get('overs', []):
            for d in over.get('deliveries', []):
                b  = d.get('batter', '')
                if not (b and ('kohli' in b.lower() or b == 'V Kohli')):
                    continue

                br   = d.get('runs', {}).get('batter', 0)
                ext  = d.get('extras', {})
                is_w = bool(ext.get('wides'))

                # Count all runs
                total_runs += br

                # Check 1: wide with batter runs (data error)
                if is_w and br > 0:
                    total_wide_batter_runs += br
                    kohli_bad_wides.append({
                        'file': fname, 'date': dates[0], 'season': str(season),
                        'batter_runs': br, 'extras': ext,
                        'delivery': d
                    })

                # Check 2: Super over
                if is_superover_inn:
                    total_superover_runs += br
                    kohli_superover.append({
                        'file': fname, 'date': dates[0], 'season': str(season),
                        'inn_idx': inn_idx, 'batter_runs': br
                    })

print("=" * 60)
print("KOHLI DATA QUALITY AUDIT")
print("=" * 60)
print(f"Total raw runs (all deliveries): {total_runs}")
print(f"Wide deliveries w/ batter>0:     {len(kohli_bad_wides)}  -> {total_wide_batter_runs} runs")
print(f"Super-over deliveries:           {len(kohli_superover)}  -> {total_superover_runs} runs")
print(f"ESPN/Cricbuzz reference:         9336")
print(f"Delta to explain:                {total_runs - 9336}")

if kohli_bad_wides:
    print(f"\nBAD WIDE DELIVERIES (batter credited runs on wide):")
    for row in kohli_bad_wides:
        print(f"  {row['file']}  date={row['date']}  season={row['season']}  batter_runs={row['batter_runs']}  extras={row['extras']}")

if kohli_superover:
    print(f"\nSUPER OVER deliveries (grouped by match):")
    by_match = defaultdict(list)
    for row in kohli_superover:
        by_match[row['file']].append(row)
    for fname, rows in by_match.items():
        so_runs = sum(r['batter_runs'] for r in rows)
        print(f"  {fname}  date={rows[0]['date']}  season={rows[0]['season']}  deliveries={len(rows)}  runs={so_runs}")

print("\n--- Season-by-season breakdown (incl super-over) ---")
season_totals = defaultdict(int)
season_so     = defaultdict(int)
seen_sig = {}

for fname in files:
    fpath = os.path.join(RAW_DIR, fname)
    try:
        with open(fpath, encoding='utf-8') as f:
            m = json.load(f)
    except Exception:
        continue
    info   = m.get('info', {})
    season = str(info.get('season', '?'))
    dates  = info.get('dates', ['?'])
    teams  = tuple(sorted(t.lower() for t in info.get('teams', [])))
    sig    = (dates[0], teams)

    # skip exact duplicates
    if sig in seen_sig:
        continue
    seen_sig[sig] = fname

    for inn_idx, inn in enumerate(m.get('innings', [])):
        is_so = bool(inn.get('super_over'))
        for over in inn.get('overs', []):
            for d in over.get('deliveries', []):
                b  = d.get('batter', '')
                if not (b and ('kohli' in b.lower() or b == 'V Kohli')):
                    continue
                br   = d.get('runs', {}).get('batter', 0)
                ext  = d.get('extras', {})
                is_w = bool(ext.get('wides'))
                if is_w:  # wide, batter runs should be 0 – but skip if >0 to separate the error
                    if br > 0:
                        season_totals[season + '(bad_wide)'] = season_totals.get(season + '(bad_wide)', 0) + br
                    continue
                season_totals[season] += br
                if is_so:
                    season_so[season] += br

print(f"\n{'Season':<15} {'Runs':>6}  {'SuperOvRuns':>12}")
grand = 0
grand_excl_so = 0
for sv in sorted(season_totals):
    r = season_totals[sv]
    so = season_so.get(sv, 0)
    grand += r
    grand_excl_so += (r - so)
    marker = " ← incl super-over" if so > 0 else ""
    print(f"  {sv:<13} {r:>6}  {so:>12}{marker}")
print(f"\n  TOTAL (with super-over): {grand}")
print(f"  TOTAL (excl super-over): {grand_excl_so}")
print(f"  ESPN reference:          9336")
