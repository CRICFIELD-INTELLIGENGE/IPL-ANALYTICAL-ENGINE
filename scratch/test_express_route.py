import json
import os
import sys

# Let's inspect what happens in stats-aggregator.ts logic using python
data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    player_season_stats = json.load(f)

with open(os.path.join(data_dir, "player-career-stats.json"), "r", encoding="utf-8") as f:
    player_career_stats = json.load(f)

print("=== CHECKING MATCHES SEASONS ===")
match_seasons = set(str(m.get("season")) for m in matches)
print("Unique seasons in matches.json:", sorted(list(match_seasons)))

print("\n=== CHECKING KOHLI SEASON VS CAREER RUNS ===")
batters_season = player_season_stats.get("batters", [])
for yr in ["2008", "2009", "2010", "2016", "2020"]:
    k_yr = [b for b in batters_season if "kohli" in str(b.get("player")).lower() and str(b.get("season")) == yr]
    print(f"Season {yr} Kohli:", k_yr)

k_career = [b for b in player_career_stats.get("batters", []) if "kohli" in str(b.get("player")).lower()]
print("Career Kohli:", k_career)

