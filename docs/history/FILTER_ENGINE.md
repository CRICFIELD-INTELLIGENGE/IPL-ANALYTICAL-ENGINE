# FILTER ENGINE

The Filter Engine is the backbone of the platform's interactive analytics, allowing users to slice massive datasets instantly.

## Where Filter State Lives
- **Frontend**: Managed globally via Zustand or React Context. Complex, shareable queries are serialized into URL parameters.
- **Backend**: Validated via Zod schemas in the API controllers.

## How Filters Propagate
1. User selects a dropdown in the UI (e.g., "Phase: Death Overs").
2. Zustand state updates.
3. React Query detects the state change and refetches the API endpoint with new query params `?phase=death`.
4. The Express server parses the query, Zod validates it.
5. The Service layer passes the filter object to Drizzle.
6. Drizzle dynamically constructs the SQL `WHERE` clause: `eq(deliveries.phase, 'death')`.
7. Filtered data returns to UI.

## Supported Dimensions

- **Season**: e.g., 2023, 2024, All Time. Maps to `matches.season_id`.
- **Team**: Maps to `team_id` in context views.
- **Player**: Maps to `batter_id`, `bowler_id`, or `fielder_id`.
- **Venue**: Maps to `venue_id`, isolating pitch conditions.
- **Phase**: Powerplay (1-6), Middle (7-15), Death (16-20). Maps to `is_powerplay` or `is_death_over`.
- **Delivery Type**: Pace, Spin, Yorker, Bouncer (mapped from advanced metadata).
- **Pressure**: High Pressure, Clutch, Standard. Maps to `deliveries.pressure_state`.

## Consumers
- **Match Explorer**: Filters by phase and pressure to see how a match changed.
- **Player Stats**: Slices a player's career by opponent or venue.
- **Intel Page**: Highly relies on multidimensional filtering to find specific matchups (e.g., "Kohli vs Rashid in Death Overs under High Pressure").
