import linecache

agg_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"
stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"
store_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\lib\store.ts"

def search_file(fp, name):
    print(f"=== SEARCHING IN {name} ===")
    with open(fp, "r", encoding="utf-8") as f:
        lines = f.readlines()
        for i, l in enumerate(lines, 1):
            if any(k in l.lower() for k in ["alias", "team_alias", "teamshort", "deccan", "daredevils", "chargers"]):
                print(f"L{i}: {l.strip()[:140]}")

search_file(agg_path, "stats-aggregator.ts")
search_file(stats_path, "stats.tsx")
search_file(store_path, "store.ts")
