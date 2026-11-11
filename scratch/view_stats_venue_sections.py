import linecache

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

print("=== VENUE TAB CARDS (L1040-L1085) ===")
for i in range(1040, 1085):
    line = linecache.getline(stats_path, i)
    if line:
        print(f"L{i}: {line.rstrip()}")

print("\n=== VENUE DETAIL OVERLAY MODAL (L1490-L1515) ===")
for i in range(1490, 1515):
    line = linecache.getline(stats_path, i)
    if line:
        print(f"L{i}: {line.rstrip()}")
