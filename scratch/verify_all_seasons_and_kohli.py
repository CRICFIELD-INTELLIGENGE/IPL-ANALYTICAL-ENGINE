import json
import os

# Verify player-season-stats has 2008, 2009, 2020 for V Kohli
p = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-season-stats.json"

with open(p, "r", encoding="utf-8") as f:
    data = json.load(f)

batters = data.get("batters", [])

kohli_2008 = [b for b in batters if "kohli" in str(b.get("player")).lower() and str(b.get("season")) == "2008"]
kohli_2009 = [b for b in batters if "kohli" in str(b.get("player")).lower() and str(b.get("season")) == "2009"]
kohli_2020 = [b for b in batters if "kohli" in str(b.get("player")).lower() and str(b.get("season")) == "2020"]

print("=== VERIFYING KOHLI SEASON STATS ===")
print("2008:", kohli_2008)
print("2009:", kohli_2009)
print("2020:", kohli_2020)

all_seasons = sorted(list(set(str(b.get("season")) for b in batters if b.get("season"))))
print("All unique seasons in player-season-stats.json:", all_seasons)
