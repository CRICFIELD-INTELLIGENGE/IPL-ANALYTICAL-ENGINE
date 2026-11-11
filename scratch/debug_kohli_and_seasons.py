import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

seasons_p = os.path.join(data_dir, "seasons.json")
matches_p = os.path.join(data_dir, "matches.json")
player_season_p = os.path.join(data_dir, "player-season-stats.json")
top_batters_p = os.path.join(data_dir, "top-batters.json")

print("=== CHECKING SEASONS IN DATASETS ===")

if os.path.exists(seasons_p):
    with open(seasons_p, "r", encoding="utf-8") as f:
        seasons_data = json.load(f)
    print("seasons.json seasons:", [s.get("season") for s in seasons_data])

if os.path.exists(matches_p):
    with open(matches_p, "r", encoding="utf-8") as f:
        matches_data = json.load(f)
    m_seasons = sorted(list(set(str(m.get("season")) for m in matches_data if m.get("season"))))
    print("matches.json unique seasons:", m_seasons)

    # Check 2008, 2009, 2020 matches count
    for yr in ["2008", "2009", "2020", "2020/21", "2007/08", "2009/10", "2019/20"]:
        cnt = len([m for m in matches_data if str(m.get("season")) == yr or str(m.get("season")).startswith(yr)])
        print(f"  Matches for season string '{yr}': {cnt}")

print("\n=== CHECKING VIRAT KOHLI IN player-season-stats.json & top-batters.json ===")

if os.path.exists(player_season_p):
    with open(player_season_p, "r", encoding="utf-8") as f:
        ps_data = json.load(f)
    batters = ps_data.get("batters", [])
    kohli_records = [b for b in batters if "kohli" in str(b.get("player")).lower()]
    print(f"Total Kohli records in player-season-stats.json: {len(kohli_records)}")
    for r in kohli_records[:15]:
        print(f"  Season: '{r.get('season')}', Player: '{r.get('player')}', Runs: {r.get('runs')}")

if os.path.exists(top_batters_p):
    with open(top_batters_p, "r", encoding="utf-8") as f:
        tb_data = json.load(f)
    runs_list = tb_data.get("runs", [])
    kohli_tb = [b for b in runs_list if "kohli" in str(b.get("player")).lower()]
    print(f"Kohli in top-batters.json runs list: {len(kohli_tb)}")
    for r in kohli_tb[:5]:
        print(" ", r)
