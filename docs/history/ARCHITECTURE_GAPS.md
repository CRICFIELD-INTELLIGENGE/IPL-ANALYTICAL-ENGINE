# ARCHITECTURAL PROBLEMS & GAPS

While the architecture is robust, there are several areas of technical debt and architectural gaps that need addressing.

## 1. Frontend Calculations vs Database Aggregations
- **Problem**: Some complex aggregations (like calculating advanced run rates over specific phases) are currently being done by `array.reduce()` on the frontend after fetching thousands of rows.
- **Impact**: Causes UI stutter on low-end devices and wastes bandwidth.
- **Fix**: Move these calculations to PostgreSQL Views or precomputed tables.

## 2. Duplicate Datasets
- **Problem**: There are multiple sources of truth for player data (e.g., `cricket-data/` CSVs vs the `players` table).
- **Impact**: Inconsistent stats if the ingestion pipeline fails or is run out of order.
- **Fix**: Make the PostgreSQL DB the strict, only source of truth. Raw files should be archived immediately after ingestion.

## 3. Redundant APIs
- **Problem**: Overlapping REST endpoints (e.g., `/api/stats/player/:id` vs `/api/analytics/player/:id`).
- **Impact**: Frontend engineers are confused about which endpoint to call for specific data, leading to duplicated React Query caches.
- **Fix**: Consolidate endpoints using GraphQL or a stricter REST resource hierarchy.

## 4. Broken or Inconsistent Filters
- **Problem**: The Filter Engine doesn't gracefully handle mutually exclusive filters (e.g., selecting "Phase: Powerplay" and "Delivery: Spin" might yield zero results but the UI doesn't warn the user).
- **Impact**: Poor user experience.
- **Fix**: Implement cascading filters where selecting one dimension updates the available options of the others.

## 5. Dead Code
- **Problem**: Legacy scripts in `scripts/` or unused components in `mockup-sandbox/` are cluttering the workspace.
- **Impact**: Increases cognitive load for new developers.
- **Fix**: Audit and delete unused code. Move mockups to a design tool like Figma.
