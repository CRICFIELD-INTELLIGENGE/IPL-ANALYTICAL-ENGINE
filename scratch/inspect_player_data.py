import os
import re

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    text = f.read()

# Let's inspect data arrays or player structures in stats.tsx
# Find all occurrences of player names:
player_names = [
    "Virat Kohli", "MS Dhoni", "Rohit Sharma", "AB de Villiers", "Suresh Raina",
    "Jasprit Bumrah", "Abhishek Sharma", "Bhuvaneshwar Kumar", "Mayank Yadav", "Sanju Samson"
]

print("=== PLAYER NAME SEARCH IN STATS.TSX ===")
for p in player_names:
    matches = [m.start() for m in re.finditer(re.escape(p), text, re.IGNORECASE)]
    print(f"'{p}': {len(matches)} occurrences")

print("\n=== SEARCHING FOR PLAYER ARRAYS OR DATA IN STATS.TSX ===")
# Find lines with player data structures
lines = text.splitlines()
for i, l in enumerate(lines):
    if "player" in l.lower() and ("image" in l.lower() or "avatar" in l.lower() or "photo" in l.lower() or "img" in l.lower() or "name" in l.lower()):
        if any(w in l.lower() for w in ["const ", "let ", "interface ", "type ", "map(", "<img", "<avatar", "src="]):
            print(f"L{i+1}: {l.strip()[:140]}")
