# 23 — Data Visualisation Design

> Chart inventory from code (`grep` of Recharts components) plus live inspection. Recharts usage: `LineChart` ×9, `BarChart` ×7, `RadarChart` ×5 (`Radar` ×7), `AreaChart` ×5, `PieChart` ×2, `ReferenceLine` ×1; plus custom SVG (heatmaps, sankey, knowledge graph, spatial/zone maps) and a three.js 3D stadium replay.

---

## 1. Inventory and fitness for purpose

| Visual | Where | Encodes | Verdict |
|---|---|---|---|
| Ranked tables with inline numbers | Scout, Stats, War Room, Ask | the primary analytic output | ✅ right choice for lookup tasks; needs units/legend |
| Diverging heatmap (bowler type × over window) | Weakness Detector | effect per 100 balls, blue↔red with grey midpoint | ✅ good: diverging scale for a signed quantity, labelled legend (`DivergingLegend`) |
| War Room price curve (domestic vs overseas) | War Room “How prices and value are set” | market price vs impact above replacement | ✅ shows the model’s shape; should show the training points and spread |
| Radar charts | Scout compare, player archetype | multiple metrics per player | ⚠️ radar distorts area, depends on axis order, hard to compare > 2 players; and here the domain is fixed to **[0, 100]** while the series include shrunk indices that can exceed 100 (e.g., 137) — values are clipped or mixed with percentiles (`scout-radar-chart.tsx:64,136`) |
| Line/area charts | season trends, win probability | time series | ✅ appropriate |
| Pie charts | (2 uses) | shares | ⚠️ replace with bars |
| Sankey, knowledge graph | `/visualizations` | flows/relationships | 🟡 decorative unless tied to a question |
| 3D stadium replay | match pages | ball trajectory | 🟡 engaging; the adapter tags each ball `VERIFIED_TRACKING`, `SECTOR_RECORDED` or `EVENT_RECONSTRUCTION` (`lib/cricket3d/deliveryAdapter.ts:1-9`) — good provenance design — but the repository contains **no ball-tracking data**, so trajectories are sector-based or reconstructed; keep that label visible |
| Pulse “emotion” meters | `/pulse` | heuristic + `Math.random()` | ❌ looks like measurement, includes noise |

---

## 2. Communicating uncertainty — CricField’s distinctive strength and its errors

**Strength.** Very few cricket sites show uncertainty at all. Scout Lab shows, per row: sample tier, balls, raw and shrunk index, 95% interval, percentile and population. Trends report “improving/declining” only when the interval of the difference excludes zero. The Weakness Detector separates “significant” findings from a “watch list”. The War Room publishes its own backtest.

**Errors found in the presentation layer:**

| Issue | Evidence | Fix |
|---|---|---|
| The CI tooltip always says “95% Wilson Score Confidence Interval” although SR/economy intervals are normal approximations | `scout-metric-badge.tsx:92`; used for `primaryMetric.ci` on `scout-home.tsx:564` | label by method |
| On Compare, dot % and boundary % intervals are rendered with a “%” unit, but the API returns them on the **index scale** (e.g., 79.4–111.6) | `scout-compare.tsx:313,327` (default `unit="%"`) | convert back to % or label as index |
| Headline (shrunk) and interval (raw) come from different estimators | Chapter 6 §1.5 | show the raw value with its interval, or compute a posterior interval for the shrunk value |
| Percentiles per competition shown in a mixed-league table | live leaderboard | add a “league” column header note or compute a pooled percentile only when leagues are calibrated |
| Thin-evidence War Room prices (basis < 3) not visually distinct | War Room live board | hatch or grey the price; show “based on N comparable sales” |

---

## 3. Analytical storytelling

| Practice | Present? |
|---|---|
| Headline sentence generated from numbers (Ask answer, strengths/weaknesses, insight feed headlines with evidence bullets) | ✅ |
| “Method” disclosure next to results (weakness method string; War Room panels; Methodology page) | ✅ |
| Reproducibility (seeded simulations, deterministic daily feed) | ✅ |
| Comparison to a baseline (league average = 100; “elsewhere” in weakness cells) | ✅ |
| Narrative pages with charts tied to a question (Insights, 2027 Intel) | 🟡 mostly editorial |

---

## 4. Visual encoding hygiene

| Principle | Status |
|---|---|
| Direction clarity (“lower is better” for economy, dot % batting) | metric definitions carry `better`, but the bowling sort ignores it |
| Units on every number | ❌ indices, raw rates and percentages often unlabeled |
| Colour accessibility | diverging palette + text labels ✅; low-contrast labels ❌ (Chapter 20) |
| Small multiples over dual axes | mostly ✅ |
| Truncated axes | radar fixed domain issue |
| Decoration vs data | hero art and motion frequently dominate data views |

---

## 5. Recommendations

1. Replace radars with **dot plots** (one row per metric, players as coloured dots, shared 0–200 index axis with a line at 100).
2. Add an “index explainer” micro-legend: *100 = league average for the same league, season and phase*.
3. Draw intervals as **horizontal error bars** in the leaderboard instead of bracketed text.
4. Label every estimate’s evidence (balls, comparable sales) and grey out low-evidence values.
5. Remove random noise from Pulse or label it as a playful, non-statistical meter.
