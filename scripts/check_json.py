import json
with open('artifacts/ipl-analytics/public/data/player-career-stats.json', encoding='utf-8') as f:
    d = json.load(f)
b = d['batters'][0]
print('TOP BATTER IN JSON FILE:')
print(f'  Player : {b["player"]}')
print(f'  Runs   : {b["runs"]}')
print(f'  Innings: {b["innings"]}')
print(f'  NotOuts: {b["notOuts"]}')
print(f'  Avg    : {b["avg"]}')
print(f'  SR     : {b["sr"]}')
