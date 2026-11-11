import json

seasons_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\matches.json"

with open(seasons_path, "r", encoding="utf-8") as f:
    matches = json.load(f)

# Test season filter with 'All', '2008', '2009', '2020'
for s_filter in ["All", "All Seasons", "2008", "2009", "2020"]:
    matched = [
        m for m in matches
        if not (s_filter and s_filter != "All Seasons" and s_filter != "All" and str(m.get("season")) != str(s_filter))
    ]
    print(f"Season filter '{s_filter}' -> Matched {len(matched)} matches")

# Test player name matching for 'Virat Kohli' against 'V Kohli'
def player_name_matches(player_name, query):
    if not query or not player_name:
        return True
    p = player_name.lower().strip()
    q = query.lower().strip()
    if q in p or p in q:
        return True
    
    p_parts = p.split()
    q_parts = q.split()
    
    if len(p_parts) >= 2 and len(q_parts) >= 2:
        p_init = p_parts[0][0]
        q_init = q_parts[0][0]
        p_last = p_parts[-1]
        q_last = q_parts[-1]
        if p_init == q_init and p_last == q_last:
            return True
    
    if len(q_parts) == 1 and q_parts[0] in p_parts:
        return True
    if len(p_parts) == 1 and p_parts[0] in q_parts:
        return True

    return False

test_queries = ["Virat Kohli", "kohli", "V Kohli", "vk"]
player_in_db = "V Kohli"

print(f"\nMatching player '{player_in_db}' against queries:")
for tq in test_queries:
    print(f" Query '{tq}' matches '{player_in_db}': {player_name_matches(player_in_db, tq)}")

