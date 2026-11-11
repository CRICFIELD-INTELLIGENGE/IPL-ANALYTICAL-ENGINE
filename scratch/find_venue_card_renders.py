import linecache
import re

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

print("=== VENUE RENDER & CLICK SEARCH ===")
for i, line in enumerate(lines, 1):
    if "venue" in line.lower() and ("onclick" in line.lower() or "card" in line.lower() or "slicedvenues" in line.lower()):
        print(f"L{i}: {line.strip()[:140]}")
