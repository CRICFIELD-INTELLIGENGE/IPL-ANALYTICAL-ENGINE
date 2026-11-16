# Analytics methodology

This page summarises each model and links to its full write-up. Every formula here is quoted from the header comments of the source file named. The status column records what the project's own validation reports say. Do not upgrade a status without new validation.

| Model | Source | Status | Full write-up |
|---|---|---|---|
| Pressure Reliability | `artifacts/api-server/src/services/pressure/` | Implemented. Ranks published. | [pressure-reliability/METHODOLOGY.md](pressure-reliability/METHODOLOGY.md) |
| Player Intelligence: impact, price, value, fit | `services/intelligence/` | Implemented, served from snapshots | [player-intelligence/README.md](player-intelligence/README.md) |
| Player Intelligence: retention probability | `services/intelligence/` | **Failed calibration gate** (error 0.13 vs 0.08 limit). Publishes no percentages. | same |
| Player Intelligence: season simulation | `services/intelligence/` | **Failed gate, turned off** (Brier 0.2516 vs 0.25 for a coin flip) | same |
| Retention CRR (Composite Retention Rating) | `services/retention/crr.ts` | Implemented. A 0–100 recommendation, never a probability. | [retention-room/V2.md](retention-room/V2.md) |
| Match engine and simulators | `services/decision/match-model.ts` | Implemented | [SCENARIO_INTELLIGENCE.md](SCENARIO_INTELLIGENCE.md) |
| Scout true-talent model | `services/scout/true-talent-model.ts` | Implemented | [global-data-engine/scout-service.md](global-data-engine/scout-service.md) |
| Multi-league metrics and identity | `scripts/src/global/metrics.ts`, `identity.ts` | Implemented | [global-data-engine/metrics.md](global-data-engine/metrics.md), [identity.md](global-data-engine/identity.md) |

## Pressure Reliability

- **Data:** every delivery from 2022 onward in the IPL, plus men's T20Is between ICC Full Members.
- **Pressure** is defined once per delivery, so the batter and bowler on the same ball share one label.
- **Value:** each ball is compared with what normally happens in that exact match state, then expressed as contextual value per 100 pressure balls.
- **Sample size:** empirical-Bayes shrinkage, so a short hot streak cannot top the table.
- `model.ts` holds the pure maths, including logistic regression by Newton–Raphson (IRLS) with a small ridge. The build script (`scripts/pressure/build-pressure-reliability.ts`) fits on the warehouse and publishes a snapshot, and serving only reads that snapshot.
- Known limit: "better than usual under pressure" (uplift) has low split-half repeatability under every definition tested, so uplift is reported but not used to rank (METHODOLOGY.md §4). The production site uses the static snapshot `public/data/pressure-reliability.json`.

## Player impact (`services/intelligence/impact-engine.ts`)

- Each ball is valued by how much it moved the batting side's expected total, using a run-expectancy (RE) table over legal balls bowled × wickets down: `run value = runs + RE(next) − RE(state)`.
- The RE table for season *s* uses only seasons *s−2…s*, so no later season leaks into an earlier estimate.
- Values are adjusted for context (season × phase × innings mean), venue (shrunken) and opposition (shrunken rating of the opposing batter or bowler).
- The pipeline is a batch job. `intelligence:train` builds features, fits in Python (`train.py`) and publishes `cf-intel-<season>.<hash>/snapshot.json`. The API serves only published snapshots.

## Retention CRR (`services/retention/crr.ts`, version 3)

- Eight components. Five are statistical: sporting output, market value, horizon. Three are planning components: continuity, assigned roles, development investment.
- Explicit franchise decision-band constraints sit on top of the components.
- The output is a recommendation of how strongly a franchise should keep a player. It is never converted into a chance of retention, and the separate forecast has its own calibration gate (currently failed).

## Scout true talent (`services/scout/true-talent-model.ts`)

A conjugate Normal–Normal update:

- observed index `X_i ~ N(θ_i, σ²/n_i)`, prior `θ_i ~ N(μ₀, τ²)`
- posterior mean `μ_i* = (n_i·X_i + k·μ₀) / (n_i + k)` with `k = σ²/τ²`
- skill ratio `n_i / (n_i + k)`; sustainability `P(θ_i > 100 | data) = Φ((μ_i* − 100)/τ_i*)`

## Principles applied across models

- **No look-ahead:** profiles and tables are built "as of" a season.
- **Shrinkage** toward a parent cell or the league for sparse samples.
- **Published snapshots:** serving code never refits models.
- **Gates are binding:** a model that fails validation publishes no numbers. See the Player Intelligence and Retention docs.
