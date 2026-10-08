import linecache

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open(path, "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

for i, line in enumerate(lines, 1):
    if "function filterMatches" in line or "filterMatches(" in line:
        print(f"L{i}: {line.strip()[:140]}")
