// Demo data for the Playing XI drawer, shown when /api/optimizer is unreachable.
// Generated from a real optimizer run (Royal Challengers Bengaluru, 2026 squad, balanced pitch).
import type { FranchisesResponse, PlayingXiResult } from "@/lib/decision-api";

export const MOCK_FRANCHISES: FranchisesResponse = {
  "season": "2026",
  "seasons": [
    "2026"
  ],
  "franchises": [
    {
      "teamId": 15,
      "squadSize": 16,
      "name": "Royal Challengers Bengaluru",
      "shortName": "RCB"
    }
  ]
};

export const MOCK_PLAYING_XI: PlayingXiResult = {
  "season": "2026",
  "teamId": 15,
  "teamName": "Royal Challengers Bengaluru",
  "pitch": "balanced",
  "constraints": {
    "maxOverseas": 4,
    "minBowlingOvers": 20,
    "minBowlingOptions": 5,
    "minBattingOptions": 6,
    "minSpinners": 1,
    "minPacers": 2,
    "requireKeeper": true
  },
  "warnings": [
    "Bowling style unknown for Abhinandan Singh — not counted as pace or spin."
  ],
  "solver": {
    "variables": 16,
    "solves": 12,
    "ms": 908
  },
  "feasible": true,
  "message": null,
  "objective": 21.21,
  "xi": [
    {
      "playerId": 135,
      "name": "V Kohli",
      "fullName": "Virat Kohli",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Medium",
      "battingHand": "R",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 27.6,
      "matchesThisSeason": 16,
      "impact": {
        "batting": 4.58,
        "bowling": 0,
        "total": 4.58,
        "pitchAdjustment": 0,
        "adjusted": 4.58
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 4.55
    },
    {
      "playerId": 434,
      "name": "PD Salt",
      "fullName": "Philip Dean Salt",
      "country": "England",
      "overseas": true,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Offbreak",
      "battingHand": "R",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 18.6,
      "matchesThisSeason": 6,
      "impact": {
        "batting": 3.18,
        "bowling": 0,
        "total": 3.18,
        "pitchAdjustment": 0,
        "adjusted": 3.18
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 3.15
    },
    {
      "playerId": 332,
      "name": "VR Iyer",
      "fullName": "Venkatesh Rajasekaran Iyer",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Medium",
      "battingHand": "L",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 17.8,
      "matchesThisSeason": 6,
      "impact": {
        "batting": 1.97,
        "bowling": 0,
        "total": 1.97,
        "pitchAdjustment": 0,
        "adjusted": 1.97
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 1.94
    },
    {
      "playerId": 315,
      "name": "RM Patidar",
      "fullName": "Rajat Manohar Patidar",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Offbreak",
      "battingHand": "R",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 17.7,
      "matchesThisSeason": 14,
      "impact": {
        "batting": 3.49,
        "bowling": 0,
        "total": 3.49,
        "pitchAdjustment": 0,
        "adjusted": 3.49
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 3.46
    },
    {
      "playerId": 345,
      "name": "TH David",
      "fullName": "Timothy Hays David",
      "country": "Australia",
      "overseas": true,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Offbreak",
      "battingHand": "R",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 11.1,
      "matchesThisSeason": 15,
      "impact": {
        "batting": 2.68,
        "bowling": 0,
        "total": 2.68,
        "pitchAdjustment": 0,
        "adjusted": 2.68
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 2.65
    },
    {
      "playerId": 366,
      "name": "JM Sharma",
      "fullName": "Jitesh Mohan Sharma",
      "country": "India",
      "overseas": false,
      "keeper": true,
      "role": "wicketkeeper",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Fast medium",
      "battingHand": "R",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 10.6,
      "matchesThisSeason": 12,
      "impact": {
        "batting": -1.92,
        "bowling": 0,
        "total": -1.92,
        "pitchAdjustment": 0,
        "adjusted": -1.92
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": null
    },
    {
      "playerId": 41,
      "name": "KH Pandya",
      "fullName": "Krunal Himanshu Pandya",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "spin",
      "bowlingStyle": "Slow Left arm Orthodox",
      "battingHand": "L",
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 8.5,
      "matchesThisSeason": 16,
      "impact": {
        "batting": -1.12,
        "bowling": 3.24,
        "total": 2.12,
        "pitchAdjustment": 0,
        "adjusted": 2.12
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 4.89
    },
    {
      "playerId": 5,
      "name": "B Kumar",
      "fullName": "Bhuvneshwar Kumar Singh",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "pace",
      "bowlingStyle": "Right arm Medium",
      "battingHand": "R",
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 1.8,
      "matchesThisSeason": 16,
      "impact": {
        "batting": -1.06,
        "bowling": 4.88,
        "total": 3.82,
        "pitchAdjustment": 0,
        "adjusted": 3.82
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 6.59
    },
    {
      "playerId": 251,
      "name": "Rasikh Salam",
      "fullName": "Rasikh Salam Dar",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "pace",
      "bowlingStyle": "Right arm Medium",
      "battingHand": "R",
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 0.7,
      "matchesThisSeason": 12,
      "impact": {
        "batting": -0.81,
        "bowling": 1.87,
        "total": 1.05,
        "pitchAdjustment": 0,
        "adjusted": 1.05
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 3.82
    },
    {
      "playerId": 307,
      "name": "JR Hazlewood",
      "fullName": "Josh Reginald Hazlewood",
      "country": "Australia",
      "overseas": true,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "pace",
      "bowlingStyle": "Right arm Fast medium",
      "battingHand": "L",
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 0.2,
      "matchesThisSeason": 13,
      "impact": {
        "batting": -0.63,
        "bowling": 2.05,
        "total": 1.42,
        "pitchAdjustment": 0,
        "adjusted": 1.42
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 4.19
    },
    {
      "playerId": 417,
      "name": "Suyash Sharma",
      "fullName": "Suyash Sharma",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "spin",
      "bowlingStyle": "Legbreak Googly",
      "battingHand": "R",
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 0,
      "matchesThisSeason": 12,
      "impact": {
        "batting": -0.23,
        "bowling": -0.95,
        "total": -1.18,
        "pitchAdjustment": 0,
        "adjusted": -1.18
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": 1.59
    }
  ],
  "bench": [
    {
      "playerId": 287,
      "name": "D Padikkal",
      "fullName": "Devdutt Padikkal",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Offbreak",
      "battingHand": "L",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 17.3,
      "matchesThisSeason": 15,
      "impact": {
        "batting": 0.03,
        "bowling": 0,
        "total": 0.03,
        "pitchAdjustment": 0,
        "adjusted": 0.03
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": null
    },
    {
      "playerId": 550,
      "name": "JA Duffy",
      "fullName": null,
      "country": "New Zealand",
      "overseas": true,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "pace",
      "bowlingStyle": "RIGHT ARM Fast Medium",
      "battingHand": "R",
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 0,
      "matchesThisSeason": 6,
      "impact": {
        "batting": -0.6,
        "bowling": -2.17,
        "total": -2.77,
        "pitchAdjustment": 0,
        "adjusted": -2.77
      },
      "confidence": "medium",
      "locked": false,
      "marginalValue": null
    },
    {
      "playerId": 534,
      "name": "JG Bethell",
      "fullName": "Jacob Graham Bethell",
      "country": "England",
      "overseas": true,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Slow Left arm Orthodox",
      "battingHand": "L",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 12.2,
      "matchesThisSeason": 7,
      "impact": {
        "batting": -3.97,
        "bowling": 0,
        "total": -3.97,
        "pitchAdjustment": 0,
        "adjusted": -3.97
      },
      "confidence": "medium",
      "locked": false,
      "marginalValue": null
    },
    {
      "playerId": 360,
      "name": "R Shepherd",
      "fullName": "Romario Shepherd",
      "country": "West Indies",
      "overseas": true,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "pace",
      "bowlingStyle": "Right arm Fast medium",
      "battingHand": "R",
      "bowlingCapacity": 3,
      "ballsFacedPerMatch": 4.4,
      "matchesThisSeason": 14,
      "impact": {
        "batting": -0.41,
        "bowling": -3.82,
        "total": -4.22,
        "pitchAdjustment": 0,
        "adjusted": -4.22
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": null
    },
    {
      "playerId": 548,
      "name": "Abhinandan Singh",
      "fullName": null,
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "unknown",
      "bowlingStyle": null,
      "battingHand": null,
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 0,
      "matchesThisSeason": 3,
      "impact": {
        "batting": -0.86,
        "bowling": -4.54,
        "total": -5.4,
        "pitchAdjustment": 0,
        "adjusted": -5.4
      },
      "confidence": "low",
      "locked": false,
      "marginalValue": null
    }
  ],
  "impactPlayer": {
    "batting": {
      "playerId": 287,
      "name": "D Padikkal",
      "fullName": "Devdutt Padikkal",
      "country": "India",
      "overseas": false,
      "keeper": false,
      "role": "batter",
      "bowlingType": "none",
      "bowlingStyle": "Right arm Offbreak",
      "battingHand": "L",
      "bowlingCapacity": 0,
      "ballsFacedPerMatch": 17.3,
      "matchesThisSeason": 15,
      "impact": {
        "batting": 0.03,
        "bowling": 0,
        "total": 0.03,
        "pitchAdjustment": 0,
        "adjusted": 0.03
      },
      "confidence": "high",
      "locked": false,
      "marginalValue": null
    },
    "bowling": {
      "playerId": 550,
      "name": "JA Duffy",
      "fullName": null,
      "country": "New Zealand",
      "overseas": true,
      "keeper": false,
      "role": "bowler",
      "bowlingType": "pace",
      "bowlingStyle": "RIGHT ARM Fast Medium",
      "battingHand": "R",
      "bowlingCapacity": 4,
      "ballsFacedPerMatch": 0,
      "matchesThisSeason": 6,
      "impact": {
        "batting": -0.6,
        "bowling": -2.17,
        "total": -2.77,
        "pitchAdjustment": 0,
        "adjusted": -2.77
      },
      "confidence": "medium",
      "locked": false,
      "marginalValue": null
    }
  },
  "composition": {
    "overseas": 3,
    "keepers": 1,
    "bowlingOvers": 20,
    "bowlingOptions": 5,
    "battingOptions": 6,
    "spinners": 2,
    "pacers": 3
  }
};
