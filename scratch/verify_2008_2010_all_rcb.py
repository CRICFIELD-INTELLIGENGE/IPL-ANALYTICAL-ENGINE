import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

with open(os.path.join(data_dir, "player-career-stats.json"), "r", encoding="utf-8") as f:
    pc_data = json.load(f)

batters_season = ps_data.get("batters", [])

def is_rcb(team):
    if not team: return False
    t = str(team).lower()
    return "bangalore" in t or "bengaluru" in t or "rcb" in t or "royal challengers" in t

print("=== 1. TEST SCENARIO: 2008 + RCB ===")
b_2008_rcb = [b for b in batters_season if str(b.get("season")) == "2008" and is_rcb(b.get("team"))]
sorted_2008 = sorted(b_2008_rcb, key=lambda x: x.get("runs", 0), reverse=True)
for i, b in enumerate(sorted_2008[:7], 1):
    print(f"#{i} {b.get('player')}: {b.get('runs')} runs ({b.get('innings')} inn)")

print("\n=== 2. TEST SCENARIO: 2010 + RCB ===")
b_2010_rcb = [b for b in batters_season if str(b.get("season")) == "2010" and is_rcb(b.get("team"))]
sorted_2010 = sorted(b_2010_rcb, key=lambda x: x.get("runs", 0), reverse=True)
for i, b in enumerate(sorted_2010[:7], 1):
    print(f"#{i} {b.get('player')}: {b.get('runs')} runs ({b.get('innings')} inn)")

print("\n=== 3. TEST SCENARIO: ALL SEASONS + RCB ===")
b_all_rcb = [b for b in ps_data.get("batters", []) if is_rcb(b.get("team"))]
# Group by player
rcb_career = {}
for b in b_all_rcb:
    p = b.get("player")
    if p not in rcb_career:
        rcb_career[p] = {"player": p, "runs": 0, "innings": 0}
    rcb_career[p]["runs"] += b.get("runs", 0)
    rcb_career[p]["innings"] += b.get("innings", 0)

sorted_all = sorted(rcb_career.values(), key=lambda x: x.get("runs", 0), reverse=True)
for i, b in enumerate(sorted_all[:7], 1):
    print(f"#{i} {b.get('player')}: {b.get('runs')} runs ({b.get('innings')} inn)")
