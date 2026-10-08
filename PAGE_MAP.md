# PAGE MAP

This document outlines the primary pages in the frontend application, detailing their purpose and the data they consume.

## 1. Home / Dashboard
- **Purpose**: The landing experience providing a snapshot of the current state of the league.
- **Features**: Live match scores, recent results, top news/feed.
- **APIs**: `/api/matches/recent`, `/api/feed`.
- **State**: Global season context.

## 2. Match Explorer
- **Purpose**: Deep dive into a specific completed match.
- **Features**: Scorecard, ball-by-ball timeline, phase filters, run rate charts.
- **Charts**: Run Rate comparison (LineChart), Fall of Wickets.
- **APIs**: `/api/matches/:id/deliveries`, `/api/matches/:id/scorecard`.

## 3. Pulse (Live/Replay)
- **Purpose**: The dramatic, narrative view of a match's momentum.
- **Features**: Win probability, momentum swings, AI-generated match narrative.
- **Charts**: Win Probability, Momentum Area Chart.
- **APIs**: `/api/analytics/momentum`, `/api/analytics/pulse`.

## 4. Stats Hub
- **Purpose**: Traditional tabular statistics view.
- **Features**: Top run-scorers, highest wicket-takers, team standings.
- **Components**: Data Tables with sorting and pagination.
- **APIs**: `/api/stats/players`, `/api/stats/teams`.

## 5. Intel (Advanced Analytics)
- **Purpose**: Pro-level tool for scouts and deep analysts.
- **Features**: Player matchups, clutch index rankings, venue biases.
- **Charts**: Pitch heatmaps, Matchup spider webs.
- **State**: Heavy reliance on the Filter Engine (Zustand).
- **APIs**: `/api/analytics/matchup`, `/api/analytics/clutch`.

## 6. Feed / Recap
- **Purpose**: Social-style feed of significant events and AI insights.
- **Features**: Infinite scroll of milestones, clutch moments.

## 7. Reports
- **Purpose**: Exportable intelligence.
- **Features**: PDF/CSV generation of saved queries.
- **APIs**: `/api/reports`.
