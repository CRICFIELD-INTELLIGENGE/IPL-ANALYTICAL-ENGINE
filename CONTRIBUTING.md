# Contributing to CRICFIELD — IPL Analytical Engine

Thank you for your interest in contributing to CRICFIELD.

## Code of Conduct

All contributors and maintainers are expected to maintain a professional, respectful, and collaborative environment.

## Development Workflow

1. Fork or branch from `main`.
2. Create a descriptive feature or bugfix branch: `feature/your-feature-name` or `fix/your-fix-name`.
3. Adhere to TypeScript and Drizzle ORM typing conventions.
4. Ensure all non-destructive typechecks pass:
   ```bash
   pnpm run typecheck
   ```
5. Do NOT mutate or rewrite existing historical cricket datasets or warehouse tables without an approved data repair migration plan.
6. Open a Pull Request referencing the relevant issue and detailing the changes made.

## Datasets and Integrity

- Cricket match data is derived from Cricsheet records (ODC-BY 1.0).
- Datasets must maintain cryptographic integrity against manifests in `data-release/`.
- Never commit raw `.env` files or credentials.
