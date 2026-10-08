import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

TEAM_ALIAS_MAP = {
    "sunrisers hyderabad": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "srh": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "royal challengers bengaluru": ["royal challengers bengaluru", "royal challengers bangalore", "rcb"],
    "rcb": ["royal challengers bengaluru", "royal challengers bangalore", "rcb"]
}

def is_match(t1, target):
    if not t1 or not target: return False
    s1, st = t1.lower().strip(), target.lower().strip()
    if s1 == st: return True
    a1 = TEAM_ALIAS_MAP.get(s1, [s1])
    at = TEAM_ALIAS_MAP.get(st, [st])
    return any(x in at for x in a1)

matches_2016_rcb_srh = [
    m for m in matches 
    if str(m.get("season")) == "2016" 
    and ((is_match(m.get("team1"), "RCB") and is_match(m.get("team2"), "SRH")) or (is_match(m.get("team1"), "SRH") and is_match(m.get("team2"), "RCB")))
]

print("=== COMBINED FILTER TEST: Season=2016, Team=RCB, Opponent=SRH ===")
print(f"Total Matches found: {len(matches_2016_rcb_srh)}")
for m in matches_2016_rcb_srh:
    print(f"Match {m.get('match_id')}: {m.get('team1')} vs {m.get('team2')} ({m.get('venue')})")
