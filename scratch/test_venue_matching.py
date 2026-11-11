import json
import os

venues_file = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\venues.json"
matches_file = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\matches.json"

with open(venues_file, "r", encoding="utf-8") as f:
    venues = json.load(f)

with open(matches_file, "r", encoding="utf-8") as f:
    matches = json.load(f)

print(f"Total venues in venues.json: {len(venues)}")
print(f"Total matches in matches.json: {len(matches)}")

print("\nSample venue names in venues.json:")
for v in venues[:10]:
    v_name = v.get("venue")
    m_exact = [m for m in matches if m.get("venue") == v_name]
    v_base = v_name.split(",")[0].strip().lower()
    m_fuzzy = [m for m in matches if v_base in m.get("venue", "").lower() or m.get("venue", "").lower().split(",")[0].strip() in v_name.lower()]
    print(f"Venue: '{v_name}' -> Exact matches: {len(m_exact)}, Fuzzy matches: {len(m_fuzzy)}")

