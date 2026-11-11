import linecache

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

print("=== LINES 1030-1110 OF STATS.TSX ===")
for i in range(1030, 1110):
    line = linecache.getline(stats_path, i)
    if line:
        print(f"L{i}: {line.rstrip()}")
