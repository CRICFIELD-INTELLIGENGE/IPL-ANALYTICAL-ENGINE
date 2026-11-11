import json
import os
import re

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

# Team Alias Map in Python for verification
TEAM_ALIASES = {
    "srh": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "deccan chargers": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "dch": ["sunrisers hyderabad", "deccan chargers", "srh", "dch"],
    "dc": ["delhi capitals", "delhi daredevils", "dc", "dd"],
    "delhi daredevils": ["delhi capitals", "delhi daredevils", "dc", "dd"],
    "pbks": ["punjab kings", "kings xi punjab", "pbks", "kxip"],
    "kings xi punjab": ["punjab kings", "kings xi punjab", "pbks", "kxip"],
    "rcb": ["royal challengers bengaluru", "royal challengers bangalore", "rcb"],
    "mi": ["mumbai indians", "mi"],
    "mumbai indians": ["mumbai indians", "mi"],
}

def is_matching_team(t1, t2):
    if not t1 or not t2: return False
    s1, s2 = t1.lower().trim() if isinstance(t1, str) else "", t2.lower().trim() if isinstance(t2, str) else ""
    if s1 == s2: return True
    a1 = TEAM_ALIASES.get(s1, [s1])
    a2 = TEAM_ALIASES.get(s2, [s2])
    return any(x in a2 for x in a1)

print("=== TEST SCENARIO 1: Season = 2009, Team = Deccan Chargers ===")
m_2009_dc = [m for m in matches if str(m.get("season")) == "2009" and (is_matching_team(m.get("team1"), "Deccan Chargers") or is_matching_team(m.get("team2"), "Deccan Chargers"))]
print(f"2009 Deccan Chargers matches: {len(m_2009_dc)}")

print("\n=== TEST SCENARIO 2: Season = 2013, Team = Mumbai Indians ===")
m_2013_mi = [m for m in matches if str(m.get("season")) == "2013" and (is_matching_team(m.get("team1"), "Mumbai Indians") or is_matching_team(m.get("team2"), "Mumbai Indians"))]
print(f"2013 Mumbai Indians matches: {len(m_2013_mi)}")
