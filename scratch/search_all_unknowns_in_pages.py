import os

pages_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src"

matches = []

for r, d, files in os.walk(pages_dir):
    for f in files:
        if f.endswith((".ts", ".tsx")):
            p = os.path.join(r, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                lines = file.readlines()
                for i, line in enumerate(lines, 1):
                    if "unknown" in line.lower():
                        matches.append((p, i, line.strip()))

print(f"Total 'unknown' occurrences in src: {len(matches)}")
for p, i, line in matches:
    rel = os.path.relpath(p, pages_dir)
    print(f"{rel}:{i} -> {line[:140]}")
