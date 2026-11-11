# Account feature saves — 2026-10-29

Implemented explicit account saves on Scout Lab, Stats and Arcade. Captures the actual Scout shortlist, Stats dimensional filters, and Arcade Higher or Lower best streak plus recent games. Account dashboard lists saved snapshots and timestamps and supports confirmed restore. One snapshot per feature replaces that feature's previous cloud save. No silent upload, automatic merge or background synchronization. Data restored to this browser remains browser-local after logout; shared-device users should clear local feature data themselves.

Uses the existing Supabase client. New public.saved_feature_data table uses user+feature primary key, bounded versioned JSON, owner-only row-level security and anonymous access revoked. Migration 202610290002_saved_feature_data.sql applied to cricfield-production. Live transaction tests verified cross-account reads, updates, deletes and inserts are denied; rolled back all test identities and rows.

Restore validates version and expected payload shape, whitelists Stats filter keys and confirms before replacing browser state. Saved Scout cards are snapshots and may need refreshing in Scout Lab. Arcade scores are personal unverified records, never competitive leaderboard evidence. Active server games/auctions are not resumed. Stats saves filter values, not SQL, result snapshots or every tab-specific control. Existing manual workspace notes and follows remain available.

Frontend typecheck passed. Desktop/mobile browser checks verify restore confirmation, account-scoped loads, session persistence/logout and Arcade save payloads using mocked Supabase calls. Real signed-in cross-device save/restore remains to be tested with a user account.

Next roadmap phase is the AI Analyst backend; WhatsApp, notifications, event automation and analytics remain pending.
