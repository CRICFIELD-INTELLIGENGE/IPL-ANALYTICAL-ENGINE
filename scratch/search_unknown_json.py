import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

results = []

for f in os.listdir(data_dir):
    if f.endswith(".json"):
        p = os.path.join(data_dir, f)
        with open(p, "r", encoding="utf-8", errors="ignore") as file:
            text = file.read()
            if "unknown" in text.lower():
                # Find occurrences
                lines = text.splitlines()
                for i, line in enumerate(lines, 1):
                    if "unknown" in line.lower():
                        results.append((f, i, line.strip()[:100]))

print(f"Total 'unknown' occurrences in public/data/*.json: {len(results)}")
for f, i, snippet in results[:30]:
    print(f"{f}:{i} -> {snippet}")
