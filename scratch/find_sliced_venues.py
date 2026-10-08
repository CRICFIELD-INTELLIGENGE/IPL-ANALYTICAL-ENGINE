import linecache

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

print("=== slicedVenues SEARCH ===")
for i, line in enumerate(lines, 1):
    if "slicedvenues" in line.lower() or "venues" in line.lower():
        if any(k in line.lower() for k in ["const ", "map(", "setselectedvenue", "onclick", "venues.data"]):
            print(f"L{i}: {line.strip()[:140]}")
