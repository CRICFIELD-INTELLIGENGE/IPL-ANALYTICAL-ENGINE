import linecache

routes_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\routes\ipl.ts"

with open("scratch/ipl_routes.txt", "w", encoding="utf-8") as out:
    for i in range(100, 180):
        line = linecache.getline(routes_path, i)
        if line:
            out.write(f"L{i}: {line}")

print("Wrote lines 100-180 to scratch/ipl_routes.txt")
