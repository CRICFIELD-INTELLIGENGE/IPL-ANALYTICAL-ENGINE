import re
import os

src_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src"

matches = []

for r, d, files in os.walk(src_dir):
    for f in files:
        if f.endswith((".ts", ".tsx", ".js", ".jsx")):
            p = os.path.join(r, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                lines = file.readlines()
                for i, line in enumerate(lines, 1):
                    if "unknown" in line.lower() and not "unknown error" in line.lower() and not "unknown" in line and not "unknown:" in line:
                        matches.append((p, i, line.strip()))
                    elif "Unknown" in line:
                        matches.append((p, i, line.strip()))

print(f"Total 'Unknown' occurrences found: {len(matches)}")
for p, i, line in matches[:25]:
    rel = os.path.relpath(p, src_dir)
    print(f"{rel}:{i} -> {line[:120]}")
