import re

home_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\home.tsx"

with open(home_path, "r", encoding="utf-8") as f:
    text = f.read()

print("=== IMAGE REFERENCES IN HOME.TSX ===")
lines = text.splitlines()
for i, line in enumerate(lines, 1):
    if any(term in line.lower() for term in ["img", "src=", "banner", "hero", "media", "insight", "bhuvaneswar", "bumrah", "abhisek", "mayank", "kohli"]):
        print(f"L{i}: {line.strip()[:140]}")
