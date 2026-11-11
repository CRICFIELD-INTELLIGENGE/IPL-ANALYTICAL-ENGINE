import json
import os

venues_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\venues.json"
matches_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\matches.json"

with open(venues_path, "r", encoding="utf-8") as f:
    venues = json.load(f)

with open(matches_path, "r", encoding="utf-8") as f:
    matches = json.load(f)

print(f"=== VERIFYING VENUE MATCHES DATA LOADING ===")
zero_match_venues = 0
total_matched = 0

for v in venues:
    v_name = v.get("venue", "")
    target_base = v_name.lower().split(",")[0].trim() if hasattr(v_name.lower().split(",")[0], "trim") else v_name.lower().split(",")[0].strip()
    target_base_clean = "".join(c for c in target_base if c.isalnum() or c.isspace())

    matched = [
        m for m in matches
        if m.get("venue") and (
            target_base_clean in "".join(c for c in m.get("venue", "").lower().split(",")[0] if c.isalnum() or c.isspace()) or
            "".join(c for c in m.get("venue", "").lower().split(",")[0] if c.isalnum() or c.isspace()) in target_base_clean
        )
    ]
    if len(matched) == 0:
        zero_match_venues += 1
    else:
        total_matched += 1

print(f"Venues with matches loaded: {total_matched} / {len(venues)}")
print(f"Venues with 0 matches: {zero_match_venues}")
