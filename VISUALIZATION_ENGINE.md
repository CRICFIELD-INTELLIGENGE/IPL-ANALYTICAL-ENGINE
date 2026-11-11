# VISUALIZATION ENGINE

The Visualization Engine bridges the gap between raw analytical data and human comprehension. It leverages multiple rendering libraries optimized for different types of charts.

## Core Rendering Libraries

### 1. Recharts
- **Purpose**: Rendering standard 2D cartesian charts (Line, Bar, Area, Scatter).
- **Why**: Excellent React integration, highly customizable tooltips, and good performance for medium-sized datasets.
- **Used For**: Run Rate charts, Batting/Bowling comparisons, historical trends.

### 2. D3.js (Conceptual / Extended)
- **Purpose**: Rendering complex, non-standard visual geometries.
- **Why**: Utterly unconstrained data-to-DOM mapping.
- **Used For**: Network graphs (player connections), Sankey diagrams (run flows from bowler to batter to boundary).

### 3. Canvas API
- **Purpose**: High-performance rendering of dense datasets.
- **Why**: When rendering 1000+ points (e.g., all deliveries in a season), SVG (Recharts/D3) becomes slow. Canvas paints pixels directly.
- **Used For**: Heatmaps, Wagon Wheels (pitch maps showing where the ball pitched and where it was hit).

## Major Chart Archetypes

### Momentum Chart (Telemetry)
- **Purpose**: Shows the swing of the match over time.
- **Dataset**: `momentum_tracker` data.
- **Rendering Library**: Recharts (AreaChart with gradient fills based on positive/negative values).
- **Page**: Pulse Page, Match Explorer.

### Win Probability Chart
- **Purpose**: Tracks the live or historical probability of a team winning.
- **Dataset**: Time-series probability array.
- **Rendering Library**: Recharts (LineChart).
- **Page**: Pulse Page.

### Pitch Heatmap
- **Purpose**: Displays bowler grouping or batter weaknesses.
- **Dataset**: X/Y coordinates of deliveries.
- **Rendering Library**: Canvas or D3 SVG.
- **Page**: Intel Page.

### Matchup Network Graph
- **Purpose**: Shows how frequently specific batters and bowlers face off, and who dominates.
- **Dataset**: Nodes (Players) and Edges (Matchups with weights).
- **Rendering Library**: D3.js.
- **Page**: Intel Page.
