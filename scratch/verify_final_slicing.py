import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

with open(os.path.join(data_dir, "player-career-stats.json"), "r", encoding="utf-8") as f:
    pc_data = json.load(f)

print("=== VERIFYING FINAL SLICING STATS ===")

seasons_to_check = ["2008", "2009", "2010", "2016", "2020", "All"]

for s in seasons_to_check:
    if s == "All":
        batters = pc_data.get("batters", [])
    else:
        batters = [b for b in ps_data.get("batters", []) if str(b.get("season")) == s]
    
    k = [b for b in batters if "kohli" in str(b.get("player")).lower()]
    print(f"Season '{s}': Total Batters = {len(batters)}")
    if k:
        b = k[0]
        print(f"   Virat Kohli -> Runs: {b.get('runs')}, Innings: {b.get('innings')}, Avg: {b.get('avg')}, SR: {b.get('sr')}")
    else:
        print("   No Kohli record found!")
