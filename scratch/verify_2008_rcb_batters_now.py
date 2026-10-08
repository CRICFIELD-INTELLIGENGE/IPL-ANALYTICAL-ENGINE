import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

b_2008 = [b for b in ps_data.get("batters", []) if str(b.get("season")) == "2008"]

rcb_batters = [b for b in b_2008 if b.get("team") and ("bangalore" in b.get("team").lower() or "bengaluru" in b.get("team").lower() or "rcb" in b.get("team").lower() or "royal challengers" in b.get("team").lower())]
sorted_rcb = sorted(rcb_batters, key=lambda x: x.get("runs", 0), reverse=True)

print("=== TOP BATTERS FOR RCB IN 2008 ===")
for i, b in enumerate(sorted_rcb, 1):
    print(f"#{i} {b.get('player')}: {b.get('runs')} runs (Innings: {b.get('innings')}, Avg: {b.get('avg')}, SR: {b.get('sr')}) | Team: {b.get('team')}")
