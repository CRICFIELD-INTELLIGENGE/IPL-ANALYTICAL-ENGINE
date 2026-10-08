import linecache

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

print("=== LINES 514-650 OF stats-aggregator.ts ===")
for i in range(514, 650):
    line = linecache.getline(path, i)
    if line:
        safe_line = line.rstrip().encode("ascii", errors="replace").decode("ascii")
        print(f"L{i}: {safe_line}")
