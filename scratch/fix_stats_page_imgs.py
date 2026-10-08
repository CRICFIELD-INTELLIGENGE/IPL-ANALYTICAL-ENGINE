import re

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace /src/assets/ references with /
new_text = text.replace("/src/assets/", "/")

if text != new_text:
    print("Replacing /src/assets/ with / in stats.tsx...")
    with open(stats_path, "w", encoding="utf-8") as f:
        f.write(new_text)
    print("Updated stats.tsx successfully!")
else:
    print("No /src/assets/ occurrences found in stats.tsx.")

