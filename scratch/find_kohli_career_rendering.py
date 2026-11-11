import re

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

for i, line in enumerate(lines, 1):
    if any(k in line for k in ["top-batters", "topBatters", "player-season-stats", "player-career-stats", "activeData", "runs", "career"]):
        if "Kohli" in line or "batter" in line.lower() or "activeData" in line:
            print(f"L{i}: {line.strip()[:140]}")
