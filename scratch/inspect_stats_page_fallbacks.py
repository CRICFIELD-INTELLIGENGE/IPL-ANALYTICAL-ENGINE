import linecache

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

for i, line in enumerate(lines, 1):
    if any(k in line for k in ["usePlayerCareerStats", "usePlayerSeasonStats", "player-career-stats", "top-batters", "topBatters", "career", "dynamicStatsQuery"]):
        print(f"L{i}: {line.strip()[:140]}")
