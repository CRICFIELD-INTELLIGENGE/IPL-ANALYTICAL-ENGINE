import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

batters = ps_data.get("batters", [])

batters_2008 = [b for b in batters if str(b.get("season")) == "2008"]

print("=== ALL BATTERS IN 2008 (RAW) ===")
for b in sorted(batters_2008, key=lambda x: x.get("runs", 0), reverse=True)[:10]:
    print(f"{b.get('player')} | Team: {b.get('team')} | Runs: {b.get('runs')}")

print("\n=== RCB BATTERS IN 2008 ===")
rcb_2008 = [b for b in batters_2008 if b.get("team") == "RCB" or b.get("team") == "Royal Challengers Bangalore" or b.get("team") == "Royal Challengers Bengaluru"]
for b in sorted(rcb_2008, key=lambda x: x.get("runs", 0), reverse=True):
    print(f"{b.get('player')} | Team: {b.get('team')} | Runs: {b.get('runs')}")
