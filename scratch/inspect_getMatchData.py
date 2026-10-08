import linecache

agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open(agg_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

for i, l in enumerate(lines, 1):
    if "getMatchData" in l or "matchData" in l or "matchesMap" in l or "matchCache" in l:
        print(f"L{i}: {l.strip()[:140]}")
