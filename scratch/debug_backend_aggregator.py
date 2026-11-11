import re

agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open(agg_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

print("=== SEARCHING FOR aggregateQueryStats & getBatsmen IN stats-aggregator.ts ===")
for i, line in enumerate(lines, 1):
    if any(k in line for k in ["aggregateQueryStats", "getBatsmen", "player-season-stats", "player-career-stats", "readDataJson"]):
        print(f"L{i}: {line.strip()[:140]}")

