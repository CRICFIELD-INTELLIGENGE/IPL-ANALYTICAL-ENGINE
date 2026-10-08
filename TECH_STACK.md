# TECH STACK INVENTORY

## Frontend
- **React (via Vite)**
  - *Why*: Industry standard for component-based UI. Vite provides extremely fast HMR and builds.
  - *Functionality*: Core rendering and UI framework.
  - *Skill Demonstrated*: SPA Architecture, Component Design.
- **TypeScript**
  - *Why*: Prevents runtime errors, enables excellent IDE autocompletion.
  - *Functionality*: Static typing across the stack.
  - *Skill Demonstrated*: Type-Safe Engineering.
- **Tailwind CSS**
  - *Why*: Rapid, utility-first styling without context switching.
  - *Functionality*: Styling and responsive design.
  - *Skill Demonstrated*: Modern CSS Architecture.
- **Radix UI**
  - *Why*: Accessible, unstyled primitives for complex UI elements (Dialogs, Selects).
  - *Functionality*: Accessibility (a11y) and behavior.
  - *Skill Demonstrated*: UI/UX Engineering.
- **Recharts**
  - *Why*: Easy integration with React for data visualization.
  - *Functionality*: Rendering graphs and charts.
  - *Skill Demonstrated*: Data Visualization.

## Backend
- **Node.js & Express.js**
  - *Why*: Non-blocking I/O is perfect for a highly concurrent API serving JSON.
  - *Functionality*: HTTP server, routing, middleware execution.
  - *Skill Demonstrated*: API Design, Backend Engineering.
- **Drizzle ORM**
  - *Why*: Type-safe SQL query builder. No hidden abstraction magic; it's just SQL with Types.
  - *Functionality*: Database querying and schema migrations.
  - *Skill Demonstrated*: Database Modeling, Query Optimization.
- **Zod**
  - *Why*: Schema declaration and validation.
  - *Functionality*: Validates incoming API payloads and ensures runtime type safety.
  - *Skill Demonstrated*: Defensive Programming.

## Database Layer
- **PostgreSQL (via SQLite during dev)**
  - *Why*: The most robust, feature-rich relational database. Handles complex joins and analytical window functions flawlessly.
  - *Functionality*: Persistent data storage.
  - *Skill Demonstrated*: Data Engineering, Relational Algebra.

## Infrastructure & Tooling
- **pnpm workspaces**
  - *Why*: Fast, efficient monorepo management.
  - *Functionality*: Links `lib` packages to `api-server` and `ipl-analytics` without publishing to npm.
  - *Skill Demonstrated*: Monorepo Architecture.
