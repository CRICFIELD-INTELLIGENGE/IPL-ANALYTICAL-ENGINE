# PROJECT TREE

```text
Data-Insight-Engine/
├── artifacts/
│   ├── api-server/         # Backend API Application
│   │   ├── src/
│   │   │   ├── data/       # Data ingestion and manipulation scripts
│   │   │   ├── lib/        # Shared backend utilities
│   │   │   ├── middlewares/# Express middlewares (e.g., error handling, logging)
│   │   │   ├── routes/     # API route controllers
│   │   │   ├── scripts/    # Utility scripts for the backend
│   │   │   └── services/   # Business logic and analytics computation
│   │   └── package.json    # Backend dependencies
│   ├── image-ingestion/    # Service for processing player/team images
│   ├── ipl-analytics/      # Frontend Web Application (React + Vite)
│   │   ├── src/
│   │   │   ├── assets/     # Static assets (images, icons)
│   │   │   ├── components/ # Reusable UI components (Radix + Tailwind)
│   │   │   ├── hooks/      # Custom React hooks for state and fetching
│   │   │   ├── lib/        # Frontend utilities and API clients
│   │   │   ├── pages/      # Route-level page components
│   │   │   └── App.tsx     # Main application layout and routing
│   │   └── package.json    # Frontend dependencies
│   └── mockup-sandbox/     # UI Mockups and sandbox testing
├── lib/
│   ├── api-client-react/   # Generated/Shared React query clients for API
│   ├── api-spec/           # API schemas and OpenAPI specs
│   ├── api-zod/            # Zod validation schemas shared across stack
│   ├── cricket-data/       # Raw cricket datasets (CSV/JSON)
│   └── db/                 # Database Layer
│       ├── src/            # Drizzle ORM schemas and connection logic
│       └── drizzle/        # Migration files
├── scripts/                # Root-level maintenance scripts (update data)
├── docs/                   # Documentation and architecture blueprints
├── schema.sql              # Core PostgreSQL database schema definition
├── migrations.sql          # SQL migration history
├── package.json            # Monorepo root package
└── pnpm-workspace.yaml     # pnpm workspace configuration
```

## Folder Explanations

### `artifacts/api-server/`
- **Purpose**: Serves as the central backend API providing data to the frontend.
- **Why it exists**: To decouple data processing and database querying from the client application, ensuring security and performance.
- **Engineering Principle**: Microservices/Service-Oriented Architecture (SOA), Separation of Concerns.

### `artifacts/ipl-analytics/`
- **Purpose**: The interactive frontend application for users to visualize data.
- **Why it exists**: To provide a rich, responsive user interface for exploring IPL intelligence.
- **Engineering Principle**: Component-driven development, Single Page Application (SPA).

### `lib/db/`
- **Purpose**: Manages database connections, schemas, and migrations using Drizzle ORM.
- **Why it exists**: Centralizes database logic so it can be shared between the API server, ingestion scripts, and background workers.
- **Engineering Principle**: Data Access Layer (DAL) abstraction, Single Source of Truth.

### `lib/api-zod/` & `lib/api-client-react/`
- **Purpose**: Shared types and API clients.
- **Why it exists**: Ensures end-to-end type safety between the backend API and frontend client.
- **Engineering Principle**: End-to-end Type Safety, DRY (Don't Repeat Yourself).
