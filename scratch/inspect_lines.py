import linecache

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

line_ranges = [(630, 645), (915, 928), (985, 998), (1560, 1575), (1820, 1835)]

for start, end in line_ranges:
    print(f"=== LINES {start}-{end} ===")
    for i in range(start, end + 1):
        line = linecache.getline(stats_path, i)
        if line:
            print(f"L{i}: {line.rstrip()}")
