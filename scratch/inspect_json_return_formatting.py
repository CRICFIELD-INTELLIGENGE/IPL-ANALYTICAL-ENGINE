import linecache

agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open("scratch/json_return.txt", "w", encoding="utf-8") as out:
    for i in range(650, 750):
        line = linecache.getline(agg_path, i)
        if line:
            out.write(f"L{i}: {line}")

print("Wrote lines 650-750 to scratch/json_return.txt")
