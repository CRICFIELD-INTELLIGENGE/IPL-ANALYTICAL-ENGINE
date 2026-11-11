# Cinematic authentication and workspace — 2026-10-29

Implemented Google + email sign-in with Apple disabled and labeled Coming Soon. Removed GitHub and Discord. Added stationary left form and a right SVG DRS illustration, an 8-second ambient trajectory, confirmed-session success overlay, tracking/impact/identity sequence, a crossfade to the existing CRICFIELD text wordmark, skip control, reduced-motion handling and pause when the document is hidden. The existing brand is a text wordmark; no separate CricField logo image was found.

Only an authenticated user verified by Supabase getUser on an OAuth/email callback can trigger the success sequence. Ordinary refresh/session restoration does not trigger it. After completion the user stays at the account dashboard, or returns to an internal next destination carried through session storage. Email requests and OAuth clicks never themselves show success.

Added an account workspace for manually entered follows, Scout notes, a saved Stats query and Arcade progress notes. Saved in public.user_workspace under owner-only row-level security. Migration: supabase/migrations/202610290001_user_workspace.sql. Live transaction test confirmed user A sees only its own workspace and cannot update B; all test data rolled back.

This is the first dashboard increment, not automatic synchronization of Scout shortlists, query history or game state. Later AI Analyst, WhatsApp, notifications, event processing and analytics phases are still pending. The attachment explicitly limits this redesign to account functionality; no unrelated engines were changed.

Google OAuth uses existing provider configuration and still requires a real provider round trip to verify. Apple OAuth is intentionally not implemented. Privacy links to the existing /privacy page; there is no Terms route, so no Terms link or legal text was invented. No production authentication settings changed.

Files: pages/account.tsx, pages/account.css, components/auth-drs.tsx, components/account-workspace.tsx, e2e/account.spec.ts, new workspace migration.

Verification: TypeScript passed; 16 mocked desktop/mobile account checks passed. Live workspace RLS isolation passed with rollback. Real Google/email callback and precise animation timing are not end-to-end verified. No real messages sent.
