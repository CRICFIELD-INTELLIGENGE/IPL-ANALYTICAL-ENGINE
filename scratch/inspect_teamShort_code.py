import linecache

agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"
front_agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\lib\aggregates.ts"

print("=== teamShort in stats-aggregator.ts ===")
with open(agg_path, "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i in range(95, 135):
        if i <= len(lines):
            print(f"L{i}: {lines[i-1].strip()}")

print("\n=== teamShort in aggregates.ts ===")
with open(front_agg_path, "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i, l in enumerate(lines, 1):
        if "teamShort" in l:
            print(f"L{i}: {l.strip()[:140]}")
