# PROJECT OVERVIEW

## Project Name
IPL Intelligence OS

## Purpose
The IPL Intelligence OS is an advanced sports analytics platform designed to ingest, process, and visualize ball-by-ball cricket data for the Indian Premier League. It serves as a comprehensive "Intelligence Operating System" that provides deep insights into player performance, team momentum, venue intelligence, and matchup probabilities.

## Primary Problem Solved
Cricket generates massive amounts of data per match (approx. 240+ deliveries), but raw scorecards fail to capture the nuances of pressure, momentum, and clutch performances. The primary problem solved by this OS is translating raw, tabular ball-by-ball data into actionable intelligence, predictive analytics, and interactive visual storytelling.

## High-level User Journey
1. **Exploration**: User lands on the Home/Feed page and sees recent matches, live pulses, and AI insights.
2. **Deep Dive**: User selects a specific match, player, or team to explore via the Match Explorer or Stats pages.
3. **Filtering**: User applies complex dimensions (venue, phase, pressure, delivery type) via the Filter Engine.
4. **Analysis**: User interacts with the Analytics Engine outputs (e.g., Win Probability, Clutch Index) rendered by the Visualization Engine.
5. **Reporting**: User exports reports or saves queries for future intelligence tracking.

## Major Modules
- **Data Pipeline & Ingestion**: Processes Cricsheet JSON/CSV and updates the PostgreSQL database.
- **Backend API (API Server)**: Express/Node.js server serving RESTful endpoints and AI insights.
- **Database Layer (DB)**: PostgreSQL schema with Drizzle ORM, managing dimension tables, fact tables, and precomputed analytics views.
- **Frontend App (IPL Analytics)**: React/Vite application with Tailwind CSS and Radix UI for interactive data visualization.
- **Analytics Engine**: Computes advanced metrics like Clutch Index, Momentum Tracker, and Auction ROI.

## Current Development Stage
The project is currently in the **Integration and Advanced Analytics** stage. The core infrastructure (monorepo setup, database schema, API server, and Vite frontend) is established. Fact tables and views are defined, and the focus is on expanding the Visualization Engine and refining the AI/Predictive models.
