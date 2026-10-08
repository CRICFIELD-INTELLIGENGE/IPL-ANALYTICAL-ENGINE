import os
import re

src_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src"

print("=== ALL VENUE CLICK / ROUTE SEARCH ===")
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(".tsx") or f.endswith(".ts"):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                text = file.read()
            for line_no, line in enumerate(text.splitlines(), 1):
                if "/venues/" in line or "selectedvenue" in line.lower() or "usevenues" in line.lower():
                    print(f"{f}:L{line_no}: {line.strip()[:140]}")
