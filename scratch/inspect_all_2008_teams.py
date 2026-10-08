import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

b_2008 = [b for b in ps_data.get("batters", []) if str(b.get("season")) == "2008"]

print("=== SAMPLE 2008 BATTERS AND THEIR TEAMS ===")
for b in b_2008[:30]:
    print(f"{b.get('player')}: {b.get('runs')} runs (Team: '{b.get('team')}')")
