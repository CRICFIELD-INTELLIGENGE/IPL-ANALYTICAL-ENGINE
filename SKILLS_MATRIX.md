# SKILLS MATRIX

This document translates the architectural implementations of the IPL Intelligence OS into core engineering skills and competencies.

| Engineering Skill | Implementation Example in Project | Why it Matters |
| :--- | :--- | :--- |
| **Relational Database Design** | Normalization of `matches`, `innings`, and `deliveries`. Use of Foreign Keys. | Ensures data integrity and eliminates redundancy in massive datasets. |
| **Advanced SQL Analytics** | Utilizing Window Functions, Materialized Views, and CTEs for metrics like `clutch_index`. | Allows complex aggregations to run natively in the DB, vastly outperforming Node.js processing. |
| **Type-Safe Fullstack Engineering** | Using Drizzle ORM and Zod to share types between DB, API, and React frontend. | Eliminates an entire class of runtime `undefined` errors and drastically speeds up development. |
| **Data Engineering / ETL** | Ingestion pipeline converting raw Cricsheet JSON into structured relational data. | The foundation of any analytics product; raw data is useless without transformation. |
| **Component Architecture** | Granular Radix + Tailwind components in `artifacts/ipl-analytics/src/components`. | Enables scaling the UI team and maintaining a consistent design system. |
| **Data Visualization** | Mapping complex arrays to Recharts and D3 SVGs (e.g., Win Probability, Momentum). | Translates abstract numbers into human-readable stories. The core value-add of the UI. |
| **Service-Oriented Backend** | Separation of Routes, Controllers, and Services in the Express API. | Allows the business logic to be tested independently of the HTTP transport layer. |
| **Monorepo Management** | `pnpm-workspace.yaml` configuring frontend, backend, and shared libs. | Simplifies dependency management and enables atomic commits across the stack. |
| **Domain-Driven Design (DDD)** | Structuring analytics specifically around Cricket domain concepts (Phases, Matchups, Clutch). | Aligns the technical implementation exactly with the business/user requirements. |
