import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

batters = ps_data.get("batters", [])

rohit = [b for b in batters if "rohit" in str(b.get("player")).lower() or "rg sharma" in str(b.get("player")).lower()]

print("=== ROHIT SHARMA SEASONAL STATS ===")
for b in sorted(rohit, key=lambda x: str(x.get("season"))):
    print(f"Season {b.get('season')}: {b.get('player')} | Team: {b.get('team')} | Runs: {b.get('runs')} | Matches: {b.get('matches') or b.get('innings')}")
