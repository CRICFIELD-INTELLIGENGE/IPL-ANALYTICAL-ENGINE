import linecache

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

print("=== LINES 280-450 OF STATS.TSX ===")
for i in range(280, 450):
    line = linecache.getline(stats_path, i)
    if line:
        safe_line = line.rstrip().encode("ascii", errors="replace").decode("ascii")
        print(f"L{i}: {safe_line}")
