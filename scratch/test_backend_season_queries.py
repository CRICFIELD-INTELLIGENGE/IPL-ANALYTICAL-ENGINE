import json
import os
import re

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "matches.json"), "r", encoding="utf-8") as f:
    matches = json.load(f)

# Test filterMatches for all seasons
all_seasons = ["2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"]

def filter_matches(season_filter):
    result = []
    for m in matches:
        s = season_filter
        if s and s != "All Seasons" and s != "All" and s != "all" and s != "":
            cleanS = re.sub(r'[^0-9]', '', str(s))
            cleanM = re.sub(r'[^0-9]', '', str(m.get("season") or ""))
            if cleanM != cleanS and str(m.get("season")) != str(s):
                continue
        result.append(m)
    return result

print("=== TESTING filterMatches FOR ALL SEASONS ===")
for s in all_seasons:
    fm = filter_matches(s)
    print(f"Season '{s}' -> Matched {len(fm)} matches")

