import linecache

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

for i, line in enumerate(lines, 1):
    if "resolvePlayerImage" in line or "alt={" in line or "<img" in line:
        print(f"L{i}: {line.strip()[:140]}")
