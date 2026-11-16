# SELF STUDY GUIDE: IPL Intelligence OS

Welcome to the IPL Intelligence OS! This guide explains the project in plain English so you can understand *what* everything is and *why* it's here.

---

## 🏗️ 1. The Monorepo Root
**What is it?** The top-level folder holding everything together. It uses `pnpm workspaces`.
**Why does it exist?** To let our frontend, backend, and database code live together and share tools (like TypeScript types) easily.
**What would break if removed?** Everything. The apps wouldn't know how to talk to each other or install dependencies.
**Skill:** Monorepo Architecture.

---

## 🗄️ 2. Database Layer (`lib/db`)
**What is it?** This folder holds our Drizzle ORM setup. It defines what our PostgreSQL database looks like (Tables: players, matches, deliveries).
**Why does it exist?** It acts as the blueprint for our data. Instead of writing raw SQL strings in our app, we use TypeScript objects here to define tables.
**What would break if removed?** The API server would crash because it wouldn't know how to connect to or query the database.
**Skill:** Database Modeling.

---

## ⚙️ 3. Backend API (`artifacts/api-server`)
**What is it?** A Node.js/Express server. It's the middleman between the Database and the Frontend.
**Why does it exist?** To securely fetch, filter, and process data from the database, then send it to the frontend as JSON. We don't want the frontend talking directly to the DB for security and performance reasons.
**What would break if removed?** The frontend UI would load, but it would have zero data. Endless loading spinners.
**Skill:** Backend API Engineering.

---

## 🎨 4. Frontend App (`artifacts/ipl-analytics`)
**What is it?** The actual website the user sees. Built with React, Vite, and Tailwind CSS.
**Why does it exist?** To provide a beautiful, interactive dashboard for users to explore the data.
**What would break if removed?** There would be no product for the user to interact with.
**Skill:** Frontend UI/UX Engineering.

---

## 🧠 5. The Analytics Engine (Inside Backend Services)
**What is it?** The math logic. It's code that calculates things like "Clutch Index" or "Win Probability".
**Why does it exist?** Raw data (runs and wickets) is boring. We need this engine to turn raw data into smart insights.
**What would break if removed?** We would only have basic scorecards, losing all the "Intelligence" part of the OS.
**Skill:** Data Science / Analytics.

---

## 🎛️ 6. Shared Types (`lib/api-zod`)
**What is it?** A folder of Zod schemas (rules defining what data should look like, e.g., "A player object must have a name string").
**Why does it exist?** So both the frontend and backend agree exactly on the shape of data.
**What would break if removed?** We'd get bugs where the frontend expects a `Number` but the backend sends a `String`.
**Skill:** Type-Safe Engineering.
