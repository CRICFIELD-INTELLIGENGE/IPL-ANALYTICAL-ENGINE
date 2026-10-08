import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

batters = ps_data.get("batters", [])

b_2008 = [b for b in batters if str(b.get("season")) == "2008"]

print("=== TEAMS IN 2008 ===")
teams_2008 = set(b.get("team") for b in b_2008)
print(teams_2008)

print("\n=== SAMPLE 2008 BATTERS WITH TEAM ===")
for b in b_2008[:15]:
    print(f"{b.get('player')}: {b.get('runs')} runs (Team: {b.get('team')})")
