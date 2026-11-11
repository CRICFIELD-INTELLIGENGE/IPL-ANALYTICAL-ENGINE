# CricField platform roadmap

## 1. Accounts — current work
Use the existing cricfield-production project (jilxgxuamfloacsfadso). Email-link authentication, Google/GitHub/Discord frontend integration, persistent sessions, logout and private owner-only profiles exist. First sign-in now creates an empty profile without replacing an existing display name. CricField ID is CF- followed by the full Supabase user UUID; it is a private account reference, never an authorization token or a public metric.

Pending activation: configure Google OAuth client ID/secret in Supabase; register https://jilxgxuamfloacsfadso.supabase.co/auth/v1/callback in Google; allow actual development and production /account redirects; set production Site URL and email SMTP. Real email and Google consent round trips remain unverified. No duplicate project was created. Provider setup: account-social-design.md in this directory.

## 2. Personalized dashboard
Build owner-scoped follows for franchise/player/league IDs, saved Scout research, Stats queries, and versioned Arcade progress. Offer explicit import of existing browser data; apply RLS and test with two accounts.

## 3. AI Analyst backend
Inventory existing analyst routes before extending them. Use server-held model credentials, bounded read-only tools for verified statistics/team comparisons/auction data, result citations, input validation and usage limits. Never expose unrestricted SQL or model secrets to the browser.

## 4. WhatsApp SDK prototype
Review https://github.com/csr1010/whatsapp-ai-agent-sdk in a separate Node project before installing. Validate Meta test-number prerequisites, webhook signatures and compatibility; test only approved recipients. This SDK has not yet been evaluated.

## 5. WhatsApp + CricField AI
Reuse the analyst tool layer. Securely verify account linking; apply channel-specific message formatting, provenance and rate limits.

## 6. Notification subscriptions
Start with in-app and email preferences, unsubscribe controls and delivery records. Add WhatsApp only after explicit opt-in and required Meta template setup.

## 7. Event automation
Implement event identity, idempotency, scheduling, background jobs, bounded retries, dead letters and delivery logs. Validate against replayed cricket events before live delivery.

## 8. Analytics and verified footer
Define privacy-conscious presence, registered-user counts, page views and feature events. Restrict detailed analytics to admins. Publish only aggregate counts derived from verified data; label freshness and omit unavailable metrics.

Sequence: finish account activation and real login verification, then dashboard persistence and analyst tools. Later phases are planned, not implemented by this roadmap.
