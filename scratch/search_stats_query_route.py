import os

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts"

for r, d, files in os.walk(root_dir):
    for f in files:
        if f.endswith((".ts", ".tsx", ".js", ".jsx")):
            p = os.path.join(r, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                content = file.read()
                if "stats/query" in content or "stats-query" in content or "player-season-stats" in content:
                    print(f"Match in: {p}")
