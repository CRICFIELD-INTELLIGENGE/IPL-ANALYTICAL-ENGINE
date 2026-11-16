# FEATURE MATRIX

| Feature | Technologies Used | Files / Services | Data Source | Purpose | Engineering Concept |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Win Probability** | TS + Math Models | `probabilityEngine.ts` | `deliveries`, `matches` | Predict live match outcomes. | Predictive Analytics / Time Series |
| **Momentum Tracker** | SQL + Node.js | `momentum_tracker` table | `deliveries` | Visualize shifts in match control. | Moving Averages / Streaming Data |
| **Clutch Index** | SQL Window Functions | `clutch_index` table | `deliveries` + `pressure_state` | Identify players who perform under pressure. | Weighted Aggregations |
| **Filter Engine** | Zustand + Drizzle | `useFilters.ts`, API routes | Query Parameters | Allow deep slicing of massive datasets. | Dynamic Query Construction |
| **Matchup Engine** | React + SQL Joins | `player_matchups` table | `deliveries` | Compare specific Batter vs Bowler history. | N:N Relationship Mapping |
| **Venue Intelligence** | SQL Aggregation | `venue_intelligence` | `matches`, `innings` | Identify pitch biases (e.g. chase bias). | Descriptive Analytics |
| **Auction ROI** | SQL + Basic Math | `auction_roi` table | `players`, `teams` | Determine if a player was worth their price. | Financial Modeling |
| **AI Insights** | LLM API + DB | `ai_insights` table | `feed_events` | Generate natural language insights. | GenAI Integration |
