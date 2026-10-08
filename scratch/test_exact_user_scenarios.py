import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

TEAM_ALIAS_MAP = {
    "sunrisers hyderabad": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "deccan chargers": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "srh": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "dch": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "mumbai indians": ["mumbai indians", "mi"],
    "mi": ["mumbai indians", "mi"]
}

def is_match_team(t1, target):
    if not t1 or not target: return False
    s1 = t1.lower().strip()
    st = target.lower().strip()
    if s1 == st: return True
    a1 = TEAM_ALIAS_MAP.get(s1, [s1])
    at = TEAM_ALIAS_MAP.get(st, [st])
    return any(x in at for x in a1)

print("=== TEST SCENARIO 1: Season = 2009 | Team = Deccan Chargers ===")
matches_2009_dc = [m for m in matches if str(m.get("season")) == "2009" and (is_match_team(m.get("team1"), "Deccan Chargers") or is_match_team(m.get("team2"), "Deccan Chargers"))]
print(f"Total Matches found: {len(matches_2009_dc)}")
for m in matches_2009_dc[:5]:
    print(f"   Match {m.get('match_id')}: {m.get('team1')} vs {m.get('team2')} ({m.get('season')})")

print("\n=== TEST SCENARIO 2: Season = 2013 | Team = Mumbai Indians ===")
matches_2013_mi = [m for m in matches if str(m.get("season")) == "2013" and (is_match_team(m.get("team1"), "Mumbai Indians") or is_match_team(m.get("team2"), "Mumbai Indians"))]
print(f"Total Matches found: {len(matches_2013_mi)}")
for m in matches_2013_mi[:5]:
    print(f"   Match {m.get('match_id')}: {m.get('team1')} vs {m.get('team2')} ({m.get('season')})")
