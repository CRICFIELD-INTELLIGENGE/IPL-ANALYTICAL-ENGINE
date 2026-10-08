import linecache

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open("scratch/json_agg.txt", "w", encoding="utf-8") as out:
    for i in range(514, 650):
        line = linecache.getline(path, i)
        if line:
            out.write(f"L{i}: {line}")

print("Wrote lines 514-650 to scratch/json_agg.txt")
