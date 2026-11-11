import json
import os
import re

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    player_season_stats = json.load(f)

with open(os.path.join(data_dir, "player-career-stats.json"), "r", encoding="utf-8") as f:
    player_career_stats = json.load(f)

def get_season_stats(target_season):
    if not target_season or target_season in ["All", "All Seasons"]:
        return player_career_stats.get("batters", [])
    
    batters = player_season_stats.get("batters", [])
    s_clean = re.sub(r'[^0-9]', '', str(target_season))
    
    matched_batters = [
        b for b in batters
        if str(b.get("season")) == str(target_season) or str(b.get("season")) == s_clean
    ]
    return matched_batters

for yr in ["2008", "2009", "2010", "2016", "2020"]:
    res = get_season_stats(yr)
    print(f"Season '{yr}' -> Total batters: {len(res)}")
    k = [b for b in res if "kohli" in str(b.get("player")).lower()]
    print(f"  Kohli in season '{yr}':", k)
