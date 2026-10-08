// Demo data for the Ask page, shown only when the API is unreachable.
// Generated from real runs against the warehouse ("Most runs in IPL 2025" and the history overview).
import type { AskResponse, HistoryOverview } from "@/lib/ask-api";

export const MOCK_QUESTION = "Most runs in IPL 2025";

export const MOCK_ANSWER: AskResponse = {
  "understood": true,
  "question": "Most runs in IPL 2025",
  "notes": [],
  "result": {
    "query": {
      "perspective": "batting",
      "metric": "runs",
      "groupBy": "player",
      "order": "desc",
      "sortBy": "metric",
      "limit": 10,
      "filters": {
        "seasonFrom": 2025,
        "seasonTo": 2025
      }
    },
    "title": "Most runs by a batter in IPL 2025",
    "answer": "Most runs by a batter in IPL 2025: B Sai Sudharsan — 759 runs off 486 balls, avg 54.21, SR 156.17. Next: SA Yadav (717).",
    "columns": [
      {
        "key": "inns",
        "label": "Inns",
        "format": "int"
      },
      {
        "key": "runs",
        "label": "Runs",
        "format": "int",
        "highlight": true
      },
      {
        "key": "balls",
        "label": "Balls",
        "format": "int"
      },
      {
        "key": "outs",
        "label": "Outs",
        "format": "int"
      },
      {
        "key": "avg",
        "label": "Avg",
        "format": "dec2"
      },
      {
        "key": "sr",
        "label": "SR",
        "format": "dec2"
      },
      {
        "key": "fours",
        "label": "4s",
        "format": "int"
      },
      {
        "key": "sixes",
        "label": "6s",
        "format": "int"
      }
    ],
    "rows": [
      {
        "key": "p369",
        "label": "B Sai Sudharsan",
        "sub": "Bhardwaj Sai Sudharsan",
        "values": {
          "inns": 15,
          "runs": 759,
          "balls": 486,
          "outs": 14,
          "avg": 54.21,
          "sr": 156.17,
          "fours": 88,
          "sixes": 21,
          "rr": 9.83,
          "avg_score": 53.1
        }
      },
      {
        "key": "p75",
        "label": "SA Yadav",
        "sub": "Suryakumar Ashok Yadav",
        "values": {
          "inns": 16,
          "runs": 717,
          "balls": 427,
          "outs": 11,
          "avg": 65.18,
          "sr": 167.92,
          "fours": 69,
          "sixes": 38,
          "rr": 10.29,
          "avg_score": 45.8
        }
      },
      {
        "key": "p135",
        "label": "V Kohli",
        "sub": "Virat Kohli",
        "values": {
          "inns": 15,
          "runs": 657,
          "balls": 454,
          "outs": 12,
          "avg": 54.75,
          "sr": 144.71,
          "fours": 66,
          "sixes": 19,
          "rr": 9.07,
          "avg_score": 45.7
        }
      },
      {
        "key": "p214",
        "label": "Shubman Gill",
        "values": {
          "inns": 15,
          "runs": 650,
          "balls": 417,
          "outs": 13,
          "avg": 50,
          "sr": 155.88,
          "fours": 62,
          "sixes": 24,
          "rr": 9.74,
          "avg_score": 44.8
        }
      },
      {
        "key": "p309",
        "label": "MR Marsh",
        "sub": "Mitchell Ross Marsh",
        "values": {
          "inns": 13,
          "runs": 627,
          "balls": 383,
          "outs": 13,
          "avg": 48.23,
          "sr": 163.71,
          "fours": 56,
          "sixes": 37,
          "rr": 10.31,
          "avg_score": 50.4
        }
      },
      {
        "key": "p144",
        "label": "SS Iyer",
        "sub": "Shreyas Santosh Iyer",
        "values": {
          "inns": 17,
          "runs": 604,
          "balls": 345,
          "outs": 12,
          "avg": 50.33,
          "sr": 175.07,
          "fours": 43,
          "sixes": 39,
          "rr": 10.92,
          "avg_score": 36.7
        }
      },
      {
        "key": "p280",
        "label": "P Simran Singh",
        "sub": "Prabhsimran Singh",
        "values": {
          "inns": 18,
          "runs": 599,
          "balls": 370,
          "outs": 17,
          "avg": 35.24,
          "sr": 161.89,
          "fours": 63,
          "sixes": 30,
          "rr": 10.04,
          "avg_score": 34.2
        }
      },
      {
        "key": "p296",
        "label": "YBK Jaiswal",
        "sub": "Yashasvi Bhupendra Kumar Jaiswal",
        "values": {
          "inns": 14,
          "runs": 559,
          "balls": 350,
          "outs": 13,
          "avg": 43,
          "sr": 159.71,
          "fours": 60,
          "sixes": 28,
          "rr": 9.91,
          "avg_score": 41.3
        }
      },
      {
        "key": "p515",
        "label": "Priyansh Arya",
        "values": {
          "inns": 18,
          "runs": 545,
          "balls": 299,
          "outs": 18,
          "avg": 30.28,
          "sr": 182.27,
          "fours": 60,
          "sixes": 31,
          "rr": 11.44,
          "avg_score": 31.6
        }
      },
      {
        "key": "p196",
        "label": "KL Rahul",
        "sub": "Kannaur Lokesh Rahul",
        "values": {
          "inns": 13,
          "runs": 539,
          "balls": 360,
          "outs": 10,
          "avg": 53.9,
          "sr": 149.72,
          "fours": 52,
          "sixes": 21,
          "rr": 9.2,
          "avg_score": 42.5
        }
      }
    ],
    "chips": [
      {
        "field": "seasonFrom",
        "label": "IPL 2025"
      }
    ],
    "qualification": null,
    "caveats": [],
    "groupsConsidered": 166,
    "ms": 94
  }
};

export const MOCK_OVERVIEW: HistoryOverview = {
  "coverage": {
    "seasons": 19,
    "firstSeason": "2008",
    "lastSeason": "2026",
    "matches": 1243,
    "deliveries": 295732,
    "players": 805,
    "venues": 36,
    "franchises": 15,
    "firstMatch": "2008/04/18",
    "lastMatch": "2026/05/31"
  },
  "seasons": [
    {
      "season": "2026",
      "matches": 74,
      "runs": 27450,
      "wickets": 878,
      "sixes": 1426,
      "fours": 2333,
      "runRate": 9.88,
      "avgFirstInnings": 193,
      "champion": "Royal Challengers Bengaluru",
      "runnerUp": "Gujarat Titans",
      "orangeCap": {
        "player": "V Suryavanshi",
        "runs": 776
      },
      "purpleCap": {
        "player": "K Rabada",
        "wickets": 29
      }
    },
    {
      "season": "2025",
      "matches": 74,
      "runs": 26503,
      "wickets": 869,
      "sixes": 1301,
      "fours": 2260,
      "runRate": 9.63,
      "avgFirstInnings": 188.8,
      "champion": "Royal Challengers Bengaluru",
      "runnerUp": "Punjab Kings",
      "orangeCap": {
        "player": "B Sai Sudharsan",
        "runs": 759
      },
      "purpleCap": {
        "player": "M Prasidh Krishna",
        "wickets": 25
      }
    },
    {
      "season": "2024",
      "matches": 71,
      "runs": 25971,
      "wickets": 883,
      "sixes": 1261,
      "fours": 2175,
      "runRate": 9.56,
      "avgFirstInnings": 189.6,
      "champion": "Kolkata Knight Riders",
      "runnerUp": "Sunrisers Hyderabad",
      "orangeCap": {
        "player": "V Kohli",
        "runs": 741
      },
      "purpleCap": {
        "player": "HV Patel",
        "wickets": 24
      }
    },
    {
      "season": "2023",
      "matches": 74,
      "runs": 25688,
      "wickets": 914,
      "sixes": 1124,
      "fours": 2175,
      "runRate": 8.99,
      "avgFirstInnings": 182.7,
      "champion": "Chennai Super Kings",
      "runnerUp": "Gujarat Titans",
      "orangeCap": {
        "player": "Shubman Gill",
        "runs": 890
      },
      "purpleCap": {
        "player": "Mohammed Shami",
        "wickets": 28
      }
    },
    {
      "season": "2022",
      "matches": 74,
      "runs": 24395,
      "wickets": 911,
      "sixes": 1062,
      "fours": 2020,
      "runRate": 8.54,
      "avgFirstInnings": 171.1,
      "champion": "Gujarat Titans",
      "runnerUp": "Rajasthan Royals",
      "orangeCap": {
        "player": "JC Buttler",
        "runs": 863
      },
      "purpleCap": {
        "player": "YS Chahal",
        "wickets": 27
      }
    },
    {
      "season": "2021",
      "matches": 60,
      "runs": 18622,
      "wickets": 716,
      "sixes": 687,
      "fours": 1549,
      "runRate": 8.05,
      "avgFirstInnings": 159.3,
      "champion": "Chennai Super Kings",
      "runnerUp": "Kolkata Knight Riders",
      "orangeCap": {
        "player": "RD Gaikwad",
        "runs": 635
      },
      "purpleCap": {
        "player": "HV Patel",
        "wickets": 32
      }
    },
    {
      "season": "2020",
      "matches": 60,
      "runs": 19352,
      "wickets": 668,
      "sixes": 735,
      "fours": 1583,
      "runRate": 8.29,
      "avgFirstInnings": 169.5,
      "champion": "Mumbai Indians",
      "runnerUp": "Delhi Capitals",
      "orangeCap": {
        "player": "KL Rahul",
        "runs": 670
      },
      "purpleCap": {
        "player": "K Rabada",
        "wickets": 30
      }
    },
    {
      "season": "2019",
      "matches": 60,
      "runs": 19400,
      "wickets": 681,
      "sixes": 784,
      "fours": 1653,
      "runRate": 8.41,
      "avgFirstInnings": 166.7,
      "champion": "Mumbai Indians",
      "runnerUp": "Chennai Super Kings",
      "orangeCap": {
        "player": "DA Warner",
        "runs": 692
      },
      "purpleCap": {
        "player": "Imran Tahir",
        "wickets": 26
      }
    },
    {
      "season": "2018",
      "matches": 60,
      "runs": 19901,
      "wickets": 720,
      "sixes": 872,
      "fours": 1652,
      "runRate": 8.65,
      "avgFirstInnings": 172.5,
      "champion": "Chennai Super Kings",
      "runnerUp": "Sunrisers Hyderabad",
      "orangeCap": {
        "player": "KS Williamson",
        "runs": 735
      },
      "purpleCap": {
        "player": "AJ Tye",
        "wickets": 24
      }
    },
    {
      "season": "2017",
      "matches": 59,
      "runs": 18769,
      "wickets": 708,
      "sixes": 705,
      "fours": 1611,
      "runRate": 8.41,
      "avgFirstInnings": 165.8,
      "champion": "Mumbai Indians",
      "runnerUp": "Rising Pune Supergiant",
      "orangeCap": {
        "player": "DA Warner",
        "runs": 641
      },
      "purpleCap": {
        "player": "B Kumar",
        "wickets": 26
      }
    },
    {
      "season": "2016",
      "matches": 60,
      "runs": 18862,
      "wickets": 665,
      "sixes": 639,
      "fours": 1633,
      "runRate": 8.31,
      "avgFirstInnings": 162.6,
      "champion": "Sunrisers Hyderabad",
      "runnerUp": "Royal Challengers Bengaluru",
      "orangeCap": {
        "player": "V Kohli",
        "runs": 973
      },
      "purpleCap": {
        "player": "B Kumar",
        "wickets": 23
      }
    },
    {
      "season": "2015",
      "matches": 59,
      "runs": 18332,
      "wickets": 686,
      "sixes": 692,
      "fours": 1607,
      "runRate": 8.37,
      "avgFirstInnings": 166.3,
      "champion": "Mumbai Indians",
      "runnerUp": "Chennai Super Kings",
      "orangeCap": {
        "player": "DA Warner",
        "runs": 562
      },
      "purpleCap": {
        "player": "DJ Bravo",
        "wickets": 26
      }
    },
    {
      "season": "2014",
      "matches": 60,
      "runs": 18909,
      "wickets": 671,
      "sixes": 714,
      "fours": 1562,
      "runRate": 8.2,
      "avgFirstInnings": 163.1,
      "champion": "Kolkata Knight Riders",
      "runnerUp": "Punjab Kings",
      "orangeCap": {
        "player": "RV Uthappa",
        "runs": 660
      },
      "purpleCap": {
        "player": "MM Sharma",
        "wickets": 23
      }
    },
    {
      "season": "2013",
      "matches": 76,
      "runs": 22541,
      "wickets": 909,
      "sixes": 675,
      "fours": 2052,
      "runRate": 7.68,
      "avgFirstInnings": 155.9,
      "champion": "Mumbai Indians",
      "runnerUp": "Chennai Super Kings",
      "orangeCap": {
        "player": "MEK Hussey",
        "runs": 733
      },
      "purpleCap": {
        "player": "DJ Bravo",
        "wickets": 32
      }
    },
    {
      "season": "2012",
      "matches": 74,
      "runs": 22453,
      "wickets": 857,
      "sixes": 733,
      "fours": 1911,
      "runRate": 7.83,
      "avgFirstInnings": 157.5,
      "champion": "Kolkata Knight Riders",
      "runnerUp": "Chennai Super Kings",
      "orangeCap": {
        "player": "CH Gayle",
        "runs": 733
      },
      "purpleCap": {
        "player": "M Morkel",
        "wickets": 25
      }
    },
    {
      "season": "2011",
      "matches": 73,
      "runs": 21154,
      "wickets": 813,
      "sixes": 639,
      "fours": 1916,
      "runRate": 7.73,
      "avgFirstInnings": 152.4,
      "champion": "Chennai Super Kings",
      "runnerUp": "Royal Challengers Bengaluru",
      "orangeCap": {
        "player": "CH Gayle",
        "runs": 608
      },
      "purpleCap": {
        "player": "SL Malinga",
        "wickets": 28
      }
    },
    {
      "season": "2010",
      "matches": 60,
      "runs": 18864,
      "wickets": 720,
      "sixes": 585,
      "fours": 1708,
      "runRate": 8.13,
      "avgFirstInnings": 164.8,
      "champion": "Chennai Super Kings",
      "runnerUp": "Mumbai Indians",
      "orangeCap": {
        "player": "SR Tendulkar",
        "runs": 618
      },
      "purpleCap": {
        "player": "PP Ojha",
        "wickets": 21
      }
    },
    {
      "season": "2009",
      "matches": 57,
      "runs": 16320,
      "wickets": 697,
      "sixes": 506,
      "fours": 1317,
      "runRate": 7.48,
      "avgFirstInnings": 150.3,
      "champion": "Deccan Chargers",
      "runnerUp": "Royal Challengers Bengaluru",
      "orangeCap": {
        "player": "ML Hayden",
        "runs": 572
      },
      "purpleCap": {
        "player": "RP Singh",
        "wickets": 23
      }
    },
    {
      "season": "2008",
      "matches": 58,
      "runs": 17937,
      "wickets": 689,
      "sixes": 623,
      "fours": 1703,
      "runRate": 8.31,
      "avgFirstInnings": 161,
      "champion": "Rajasthan Royals",
      "runnerUp": "Chennai Super Kings",
      "orangeCap": {
        "player": "SE Marsh",
        "runs": 616
      },
      "purpleCap": {
        "player": "Sohail Tanvir",
        "wickets": 22
      }
    }
  ],
  "health": [
    {
      "id": "coverage",
      "label": "Ball-by-ball coverage",
      "status": "ok",
      "value": "1,243 / 1,243 matches",
      "detail": "Every match in the database has full ball-by-ball data."
    },
    {
      "id": "batting-reconcile",
      "label": "Batting scorecards reconcile",
      "status": "ok",
      "value": "Exact match",
      "detail": "381,529 runs summed ball by ball vs 381,529 on the batting scorecards."
    },
    {
      "id": "bowling-reconcile",
      "label": "Bowling scorecards reconcile",
      "status": "info",
      "value": "6 wickets apart",
      "detail": "The fact_bowling_spells table credits 6 \"retired out\" dismissals to the bowler. They are not bowler wickets, so stats here use the dismissals table (13,482 wickets)."
    },
    {
      "id": "innings-totals",
      "label": "Innings totals match deliveries",
      "status": "ok",
      "value": "All innings",
      "detail": "Team totals stored on each innings are checked against the sum of its deliveries. Stats here always use the deliveries."
    },
    {
      "id": "super-overs",
      "label": "Super overs",
      "status": "info",
      "value": "34 innings excluded",
      "detail": "Super-over innings are kept in the database but left out of every stat, as in official IPL records."
    },
    {
      "id": "fielders",
      "label": "Fielder on catches & stumpings",
      "status": "warn",
      "value": "0% recorded",
      "detail": "Fielders are missing from the dismissals table, so catches can't be credited yet. Wicketkeepers are identified from stumpings in the raw Cricsheet files instead."
    },
    {
      "id": "ball-speed",
      "label": "Ball speed recorded",
      "status": "info",
      "value": "2.4% of balls",
      "detail": "7,173 deliveries carry a speed reading — enough to tell pace from spin for most current bowlers, not for speed analysis."
    },
    {
      "id": "nationality",
      "label": "Player nationality known",
      "status": "ok",
      "value": "92.4% of balls faced",
      "detail": "Drives overseas / Indian filters and the 4-overseas rule. Unknown players are treated as Indian."
    },
    {
      "id": "bowling-type",
      "label": "Pace / spin known",
      "status": "ok",
      "value": "99.8% of balls bowled",
      "detail": "From recorded ball speeds first, then listed bowling styles. Bowlers of unknown type are left out of pace/spin filters."
    },
    {
      "id": "batting-hand",
      "label": "Batting hand known",
      "status": "ok",
      "value": "99.9% of balls faced",
      "detail": "Left/right-hander filters only include batters whose hand is listed in the bio or style sources."
    }
  ],
  "ms": 2399
};
