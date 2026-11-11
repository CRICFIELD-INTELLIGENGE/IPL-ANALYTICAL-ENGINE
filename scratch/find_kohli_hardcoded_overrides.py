import linecache

agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"
stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

print("=== SEARCHING IN stats-aggregator.ts ===")
with open(agg_path, "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i, l in enumerate(lines, 1):
        if "Kohli" in l or "isKohli" in l or "hardcoded" in l.lower() or "override" in l.lower():
            print(f"stats-aggregator.ts L{i}: {l.strip()[:140]}")

print("\n=== SEARCHING IN stats.tsx ===")
with open(stats_path, "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i, l in enumerate(lines, 1):
        if "Kohli" in l or "isKohli" in l or "9346" in l or "9336" in l or "career" in l.lower():
            if "virat" in l.lower() or "kohli" in l.lower() or "activeData" in l:
                print(f"stats.tsx L{i}: {l.strip()[:140]}")
