import re
import json

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    text = f.read()

# Find all occurrences of player names, image properties, avatar properties, or player objects
print("Searching for image references and player objects...")

# Look for avatar / image / img / src properties
lines = text.splitlines()
matching_lines = []
for idx, line in enumerate(lines):
    if any(k in line.lower() for k in ["image", "avatar", "photo", "pic", "thumb", "logo", "banner", "devillers", "kohli", "bumrah", "abhisek", "bhuvaneswar", "mayank"]):
        matching_lines.append((idx + 1, line.strip()))

print(f"Total matching lines found: {len(matching_lines)}")
for line_no, content in matching_lines[:50]:
    print(f"L{line_no}: {content[:120]}")
