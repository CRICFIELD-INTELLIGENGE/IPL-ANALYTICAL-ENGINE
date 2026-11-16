# FRONTEND ARCHITECTURE

## Technology Stack
- **Framework**: React via Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI (Headless components) + custom components
- **Charts**: Recharts, D3 (via specific integrations)
- **State Management**: Zustand (for global state), React Query (for server state)
- **Routing**: Wouter

## Folder Structure Analysis (`artifacts/ipl-analytics/src/`)

### `components/`
- **Purpose**: Houses reusable, presentation-level UI elements.
- **Contents**: Buttons, Cards, Dialogs, Filter panels, and Chart wrappers.
- **Engineering Principle**: Atomic Design, Component Reusability.

### `hooks/`
- **Purpose**: Custom React hooks for shared logic.
- **Contents**: `useFilters`, `useMatchData`, `useAnalytics`.
- **Engineering Principle**: Custom Hooks for Logic Abstraction.

### `lib/`
- **Purpose**: Utility functions and API integration setups.
- **Contents**: Axios instances, date formatting, data transformation helpers.
- **Engineering Principle**: DRY (Don't Repeat Yourself).

### `pages/`
- **Purpose**: Top-level route components.
- **Contents**: `Home`, `MatchExplorer`, `Stats`, `Pulse`, `Intel`.
- **Engineering Principle**: Page-based routing separation.

### `assets/`
- **Purpose**: Static files.
- **Contents**: Images, logos, fonts.

## Major Components Example

### `AnalyticsChart` (Conceptual)
- **Purpose**: Renders multidimensional data (e.g., Win Probability over time).
- **Inputs**: Dataset array, x-axis key, y-axis keys, chart type.
- **Outputs**: Rendered Recharts component.
- **Dependencies**: Recharts, Tailwind configuration for colors.
- **Used by**: `MatchExplorer`, `Pulse`, `Reports`.

### `FilterPanel` (Conceptual)
- **Purpose**: Allows users to slice data by venue, season, team, or player.
- **Inputs**: Current filter state, available filter options.
- **Outputs**: Dispatches actions to Zustand store or URL parameters.
- **Dependencies**: Radix UI Select/Checkbox components.
- **Used by**: All analytics pages.
