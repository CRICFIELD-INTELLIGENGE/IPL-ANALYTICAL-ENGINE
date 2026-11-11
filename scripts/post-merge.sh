#!/bin/bash
set -e
pnpm install --frozen-lockfile
# `pnpm --filter db push` (drizzle-kit push against ../../sqlite.db) was removed from this automatic hook on
# 2026-10-14 (DAY-05-REPORT.md). The drizzle schema in lib/db/src/schema does not declare delivery_commentary
# (293,652 rows), player_matchups (31,370) or insight_clicks, so a push would DROP them from the production
# warehouse. Schema changes to sqlite.db are made only by reviewed scripts on a copy (scripts/src/day4/).
