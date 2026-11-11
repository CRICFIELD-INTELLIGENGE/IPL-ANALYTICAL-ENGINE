"""
Full audit of all players after the fix.
Reports:
  - Any player where innings > matches
  - Any player where career runs != sum of season runs
  - Top 15 batters and top 15 bowlers with corrected stats
  - Summary of fix quality
"""
import os, json, sys
from collections import defaultdict

PUBLIC_DIR = r'c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data'

# Load career stats
with open(os.path.join(PUBLIC_DIR, 'player-career-stats.json'), encoding='utf-8') as f:
    cs = json.load(f)

batters  = cs['batters']
bowlers  = cs['bowlers']

# Load season stats
with open(os.path.join(PUBLIC_DIR, 'player-season-stats.json'), encoding='utf-8') as f:
    ss = json.load(f)

season_batters = ss['batters']
season_bowlers = ss['bowlers']

print(f"Total batters: {len(batters)}, Total bowlers: {len(bowlers)}")
print(f"Total season batter rows: {len(season_batters)}, Total season bowler rows: {len(season_bowlers)}")

# ── CHECK 1: innings > matches (impossible in T20) ────────────────────
print("\n" + "="*60)
print("CHECK 1: Innings > Matches (impossible)")
print("="*60)
bat_inn_issues = [(b['player'], b['matches'], b['innings'])
                  for b in batters if b['innings'] > b['matches']]
bowl_inn_issues = [(w['player'], w['matches'], w['innings'])
                   for w in bowlers if w['innings'] > w['matches']]
if bat_inn_issues:
    print(f"BATTER ISSUES ({len(bat_inn_issues)}):")
    for p, m, i in sorted(bat_inn_issues, key=lambda x: -(x[2]-x[1]))[:20]:
        print(f"  {p:<25s} matches={m}  innings={i}  excess={i-m}")
else:
    print("BATTERS: All OK (innings <= matches for every player)")

if bowl_inn_issues:
    print(f"BOWLER ISSUES ({len(bowl_inn_issues)}):")
    for p, m, i in sorted(bowl_inn_issues, key=lambda x: -(x[2]-x[1]))[:20]:
        print(f"  {p:<25s} matches={m}  innings={i}  excess={i-m}")
else:
    print("BOWLERS: All OK (innings <= matches for every player)")

# ── CHECK 2: Sum of season runs == career runs ───────────────────────
print("\n" + "="*60)
print("CHECK 2: Career runs == sum of season runs")
print("="*60)
# Build season sum per player
season_run_sum = defaultdict(int)
for row in season_batters:
    season_run_sum[row['player']] += row['runs']

season_wkt_sum = defaultdict(int)
for row in season_bowlers:
    season_wkt_sum[row['player']] += row['wickets']

career_run_map = {b['player']: b['runs'] for b in batters}
career_wkt_map = {w['player']: w['wickets'] for w in bowlers}

run_mismatches = []
for p, career_r in career_run_map.items():
    season_r = season_run_sum.get(p, 0)
    if career_r != season_r:
        run_mismatches.append((p, career_r, season_r, career_r - season_r))

wkt_mismatches = []
for p, career_w in career_wkt_map.items():
    season_w = season_wkt_sum.get(p, 0)
    if career_w != season_w:
        wkt_mismatches.append((p, career_w, season_w, career_w - season_w))

if run_mismatches:
    run_mismatches.sort(key=lambda x: abs(x[3]), reverse=True)
    print(f"BATTER run mismatches (career != season sum): {len(run_mismatches)}")
    for p, c, s, d in run_mismatches[:20]:
        print(f"  {p:<25s} career={c}  season_sum={s}  diff={d:+d}")
else:
    print("BATTERS: All OK (career runs == sum of all season runs for every player)")

if wkt_mismatches:
    wkt_mismatches.sort(key=lambda x: abs(x[3]), reverse=True)
    print(f"BOWLER wicket mismatches (career != season sum): {len(wkt_mismatches)}")
    for p, c, s, d in wkt_mismatches[:20]:
        print(f"  {p:<25s} career={c}  season_sum={s}  diff={d:+d}")
else:
    print("BOWLERS: All OK (career wickets == sum of all season wickets for every player)")

# ── CHECK 3: notOuts <= innings ──────────────────────────────────────
print("\n" + "="*60)
print("CHECK 3: Not-outs <= Innings")
print("="*60)
no_issues = [(b['player'], b['innings'], b['notOuts'])
             for b in batters if b['notOuts'] > b['innings']]
if no_issues:
    print(f"ISSUES ({len(no_issues)}):")
    for p, i, no in no_issues:
        print(f"  {p}  innings={i}  not_outs={no}")
else:
    print("All OK (not_outs <= innings for every batter)")

# ── CHECK 4: Avg = runs / (innings - not_outs) ───────────────────────
print("\n" + "="*60)
print("CHECK 4: Average formula correctness")
print("="*60)
avg_errors = []
for b in batters:
    dis = b['innings'] - b['notOuts']
    expected = round(b['runs']/dis, 2) if dis > 0 else b['runs']
    if abs(expected - b['avg']) > 0.02:
        avg_errors.append((b['player'], b['runs'], b['innings'], b['notOuts'], b['avg'], expected))
if avg_errors:
    print(f"AVERAGE formula errors: {len(avg_errors)}")
    for row in avg_errors[:10]:
        print(f"  {row[0]}: stored={row[4]}  expected={row[5]}")
else:
    print("All OK (avg == runs / dismissals for every batter)")

# ── TOP 15 BATTERS ───────────────────────────────────────────────────
print("\n" + "="*60)
print("TOP 15 BATTERS (corrected)")
print("="*60)
print(f"{'#':<3} {'Player':<22} {'Team':<30} {'M':>4} {'Inn':>4} {'NO':>4} {'Runs':>6} {'Balls':>6} {'Avg':>7} {'SR':>7} {'4s':>4} {'6s':>4} {'50s':>4} {'100s':>5} {'HS':>4}")
print("-"*135)
for i, b in enumerate(batters[:15], 1):
    print(f"{i:<3} {b['player']:<22} {b['team']:<30} {b['matches']:>4} {b['innings']:>4} {b['notOuts']:>4} {b['runs']:>6} {b['balls']:>6} {b['avg']:>7} {b['sr']:>7} {b['fours']:>4} {b['sixes']:>4} {b['fifties']:>4} {b['hundreds']:>5} {b['highest']:>4}")

# ── TOP 15 BOWLERS ───────────────────────────────────────────────────
print("\n" + "="*60)
print("TOP 15 BOWLERS (corrected)")
print("="*60)
print(f"{'#':<3} {'Player':<22} {'Team':<30} {'M':>4} {'Inn':>4} {'Overs':>7} {'Runs':>6} {'Wkts':>5} {'Avg':>7} {'Econ':>6} {'SR':>7} {'BBI':>7} {'4W':>3} {'5W':>3}")
print("-"*130)
for i, w in enumerate(bowlers[:15], 1):
    print(f"{i:<3} {w['player']:<22} {w['team']:<30} {w['matches']:>4} {w['innings']:>4} {w['overs']:>7} {w['runs']:>6} {w['wickets']:>5} {w['avg']:>7} {w['econ']:>6} {w['sr']:>7} {w['best']:>7} {w['fourW']:>3} {w['fiveW']:>3}")

# ── SUMMARY ──────────────────────────────────────────────────────────
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"Total batters processed:       {len(batters)}")
print(f"Total bowlers processed:       {len(bowlers)}")
print(f"Innings > Matches (batters):   {len(bat_inn_issues)}")
print(f"Innings > Matches (bowlers):   {len(bowl_inn_issues)}")
print(f"Run mismatches (career/season):{len(run_mismatches)}")
print(f"Wicket mismatches:             {len(wkt_mismatches)}")
print(f"Average formula errors:        {len(avg_errors)}")
print(f"Not-out > innings errors:      {len(no_issues)}")
total_errors = len(bat_inn_issues)+len(bowl_inn_issues)+len(run_mismatches)+len(wkt_mismatches)+len(avg_errors)+len(no_issues)
if total_errors == 0:
    print("\nRESULT: ZERO errors found across all players. Data is clean.")
else:
    print(f"\nRESULT: {total_errors} total errors found. Needs further investigation.")
