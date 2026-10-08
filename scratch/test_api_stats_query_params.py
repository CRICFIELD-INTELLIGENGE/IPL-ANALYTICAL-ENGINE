import json
import os
import re

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
raw_dir = os.path.join(root_dir, "lib", "cricket-data", "raw")
matches_path = os.path.join(root_dir, "artifacts", "ipl-analytics", "public", "data", "matches.json")
squads_path = os.path.join(root_dir, "artifacts", "ipl-analytics", "public", "data", "current-squads.json")

with open(matches_path, "r", encoding="utf-8") as f:
    matches = json.load(f)

with open(squads_path, "r", encoding="utf-8") as f:
    squads = json.load(f)

rcb_2026_squad = set(p.get("playerName", "").lower().strip() for p in squads if "rcb" in p.get("currentTeam", "").lower() or "bangalore" in p.get("currentTeam", "").lower() or "bengaluru" in p.get("currentTeam", "").lower())
print(f"2026 RCB Squad count: {len(rcb_2026_squad)}")
print("2026 RCB Squad:", list(rcb_2026_squad)[:10])

# Let's check 2008 matches for RCB
m_2008_rcb = [m for m in matches if str(m.get("season")) == "2008" and ("bangalore" in str(m.get("team1")).lower() or "bangalore" in str(m.get("team2")).lower())]
print(f"2008 RCB Matches: {len(m_2008_rcb)}")
