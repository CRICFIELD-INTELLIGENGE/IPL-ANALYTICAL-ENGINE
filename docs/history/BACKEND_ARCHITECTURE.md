# BACKEND ARCHITECTURE

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Logging**: Pino

## Folder Structure Analysis (`artifacts/api-server/src/`)

### `routes/`
- **Function**: Defines the HTTP API endpoints and maps them to controllers/services.
- **Responsibilities**: Route definition, HTTP method handling, param extraction.
- **Why Separated**: Keeps the HTTP layer distinct from business logic. Allows for easy versioning (e.g., `/api/v1/`).

### `services/`
- **Function**: Contains the core business logic and analytics computation.
- **Responsibilities**: Calculating momentum, processing data aggregations, calling the DB layer.
- **Why Separated**: Ensures business rules are independent of the transport layer (Express), making them testable and reusable.

### `middlewares/`
- **Function**: Functions that run before the final route handler.
- **Responsibilities**: Authentication, input validation (using Zod), error handling, request logging.
- **Why Separated**: Promotes cross-cutting concerns to be applied globally or specifically without cluttering route logic.

### `data/`
- **Function**: Scripts and logic for ingesting and processing raw cricket datasets.
- **Responsibilities**: Parsing Cricsheet JSON/CSV, mapping to DB schema, handling upserts.
- **Why Separated**: Isolates heavy ETL (Extract, Transform, Load) tasks from real-time API serving.

### `lib/`
- **Function**: Shared backend utilities.
- **Responsibilities**: Database connection pooling, environment variable parsing, standard formatting.
- **Why Separated**: DRY utility code.

## Architecture Pattern
The backend follows a **Layered Architecture** (Controller -> Service -> Data Access). It is heavily geared towards read-heavy analytical queries, leveraging Drizzle ORM for type-safe SQL query building against the PostgreSQL database.
