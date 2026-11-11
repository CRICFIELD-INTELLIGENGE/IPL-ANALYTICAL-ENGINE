import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

batters_2012 = [b for b in ps_data.get("batters", []) if str(b.get("season")) == "2012"]
sorted_2012 = sorted(batters_2012, key=lambda x: x.get("runs", 0), reverse=True)

print("=== TOP 10 BATTERS IN 2012 SEASON ===")
for i, b in enumerate(sorted_2012[:10], 1):
    print(f"#{i} {b.get('player')}: {b.get('runs')} runs ({b.get('innings')} inn, avg {b.get('avg')}, sr {b.get('sr')})")

kohli_2012 = [b for b in sorted_2012 if "kohli" in str(b.get("player")).lower()]
print("\nVirat Kohli in 2012:", kohli_2012)
