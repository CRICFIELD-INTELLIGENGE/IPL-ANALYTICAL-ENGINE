import json
import os
import re

# Let's inspect stats-aggregator.ts and static JSON files for every season
data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

with open(os.path.join(data_dir, "top-batters.json"), "r", encoding="utf-8") as f:
    top_batters_data = json.load(f)

with open(os.path.join(data_dir, "player-career-stats.json"), "r", encoding="utf-8") as f:
    pc_data = json.load(f)

all_seasons = sorted(list(set(str(m.get("season")) for m in matches if m.get("season"))))

print("=== TESTING ALL SEASONS IN player-season-stats.json ===")
for season in all_seasons:
    season_batters = [b for b in ps_data.get("batters", []) if str(b.get("season")) == season]
    top_batter = sorted(season_batters, key=lambda x: x.get("runs", 0), reverse=True)[0] if season_batters else None
    kohli = [b for b in season_batters if "kohli" in str(b.get("player")).lower()]
    print(f"Season '{season}': Total Batters = {len(season_batters)}")
    if top_batter:
        print(f"   #1 Batter: {top_batter.get('player')} with {top_batter.get('runs')} runs")
    if kohli:
        print(f"   Kohli: {kohli[0].get('runs')} runs")
    else:
        print(f"   Kohli: NO RECORD IN SEASON '{season}'")

