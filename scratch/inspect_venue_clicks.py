import re

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

# Search for venue onClick, setSelectedVenue, venue card render, venue modal, venue state
print("=== VENUE CLICK & MODAL SEARCH IN STATS.TSX ===")
for idx, line in enumerate(lines, 1):
    if any(k in line.lower() for k in ["selectedvenue", "venue", "onvenueclick", "setselectedvenue"]):
        if any(w in line.lower() for w in ["onclick", "state", "modal", "find", "filter", "detail", "dialog"]):
            print(f"L{idx}: {line.strip()[:140]}")

