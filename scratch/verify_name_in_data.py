import json

top_bowlers_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\top-bowlers.json"
career_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-career-stats.json"

with open(top_bowlers_path, "r", encoding="utf-8") as f:
    bowlers = json.load(f)

with open(career_path, "r", encoding="utf-8") as f:
    career = json.load(f)

print("=== SEARCHING FOR MALINGA & CHAHAL NAMES IN DATASETS ===")
found_names = set()

def search_obj(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "player" or k == "playerName" or k == "holder":
                if any(t in str(v).lower() for t in ["malinga", "chahal"]):
                    found_names.add(str(v))
            search_obj(v)
    elif isinstance(obj, list):
        for item in obj:
            search_obj(item)

search_obj(bowlers)
search_obj(career)

for n in sorted(found_names):
    print("Found player name in data:", n)

