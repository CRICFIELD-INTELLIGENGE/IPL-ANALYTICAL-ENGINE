import linecache

agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open("scratch/season_slicing_debug.txt", "w", encoding="utf-8") as out:
    for i in range(500, 720):
        line = linecache.getline(agg_path, i)
        if line:
            out.write(f"L{i}: {line}")

print("Wrote lines 500-720 to scratch/season_slicing_debug.txt")
