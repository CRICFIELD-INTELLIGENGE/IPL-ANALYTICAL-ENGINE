import linecache

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

for i in range(780, 860):
    line = linecache.getline(stats_path, i)
    if line:
        print(f"L{i}: {line.rstrip()}")
