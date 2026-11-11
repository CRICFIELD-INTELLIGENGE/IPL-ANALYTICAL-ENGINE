import linecache

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open("scratch/where_sql_debug.txt", "w", encoding="utf-8") as out:
    for i in range(1370, 1425):
        line = linecache.getline(path, i)
        if line:
            out.write(f"L{i}: {line}")

print("Wrote lines 1370-1425 to scratch/where_sql_debug.txt")
