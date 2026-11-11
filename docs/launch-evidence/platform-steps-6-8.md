# Steps 6–8: notifications, event automation and analytics

Implemented 29 October 2026. The operations database is separate from cricket warehouses and Supabase profile tables.

## Step 6 — subscriptions and delivery

Account now includes event/topic preferences, opt-in in-app/email/WhatsApp channels, optional phone, a notification inbox and read controls. API verifies the current Supabase access token with Auth and uses the verified account ID and confirmed email; callers cannot choose another account ID or email destination. Preference changes record a consent timestamp. Editing a phone resets its verification.

Email uses Resend with stable per-delivery idempotency keys and a signed unsubscribe link with a confirmation page. Disabling a channel cancels queued work when it is claimed. WhatsApp requires recorded opt-in, admin-attested ownership verification, an enabled provider flag and a pre-approved Meta template. The verification admin endpoint is only for an operator who has independently verified ownership; it is not an automated OTP flow. External sends are blocked until credentials exist. No real email/WhatsApp messages were sent in tests.

## Step 7 — durable operations

SQLite WAL stores preferences, source-attributed events, fanout jobs, leased claims, retry state, delivery outcomes and detector checkpoints. Default path from API cwd: data/platform.sqlite. It must be on persistent storage. Event IDs and unique event+user+channel keys prevent duplicate fanout. The worker runs every 30 seconds, with five-attempt exponential retry limits, dead letters, provider-not-configured blocking and rechecks of current subscriptions.

Email retry uses provider idempotency. WhatsApp transport ambiguity is quarantined as uncertain rather than retried blindly. Rate-limit responses can retry. Expired external alerts (over 24h) are dropped. Lease expiry recovers email jobs and quarantines WhatsApp jobs. Delivery/outcome records are private; back up and apply operational retention/rotation before production. Multiple hosts need a shared managed queue/database; this implementation is for one durable API host.

Auction purchase/retention detectors consume the existing sourced auction desk. First startup records a baseline instead of notifying about historical records. Subsequent changes create events. Wicket/result detection accepts a configured trusted HTTPS observation feed (schema below) and compares persisted snapshots; the first observation is a baseline. There is deliberately no use of scraper demo/fallback scores. Admins can also ingest verified source-attributed events using POST /api/admin/events.

Daily digests run once per UTC date at/after DIGEST_HOUR_UTC (default 18), using up to ten sourced events from the last 24h. No empty digests. The worker must be running. POST /api/admin/jobs/run allows an operator-triggered tick.

Observation feed contract for CRICKET_EVENT_FEED_URL:

    {"source":"https://official.example/score","observedAt":1793232000000,"matches":[{"id":"match-id","label":"A vs B","homeWickets":1,"awayWickets":0,"status":"live"}]}

Observations older than five minutes are rejected. Completed matches use status complete and a result string. Providers are configured by the operator; URLs are attribution, not proof that a third-party statement is correct. Live match alerts require a real feed adapter supplying this contract. No feed URL was invented or activated.

## Step 8 — measured analytics

Footer displays confirmed-account count from a restricted public aggregate Supabase function, recently active opted-in browsers and measured 30-day page views, with explicit scope/freshness labels. Missing account count is omitted. No invented metrics or hidden trackers.

A separate footer checkbox starts first-party telemetry. It stores only broad feature categories, event kind and a daily hashed browser-session ID, excluding questions, account IDs and full URLs. Heartbeats run only for visible pages; inactive presence expires. Raw usage events older than 30 days are purged on collection. These are measured browser events, not bot-verified unique people. Opt-out stops new events; prior anonymous aggregates remain until retention expires.

/admin/analytics provides account count, feature engagement, queue counts and delivery outcomes. It requires the existing x-admin-token authentication. The UI holds the admin token only in component memory; it is never in a URL or local storage. An admin token was generated into the ignored env/api.env when absent; inspect that file privately to access the dashboard.

## Configuration

Ready locally: server Supabase URL/public key copied from existing frontend configuration; private signing/admin secrets generated; PLATFORM_WORKER_ENABLED=true. Supabase migration 202610290003_public_registered_count.sql applied. It counts confirmed non-deleted accounts only; no identities are exposed. New local operational SQLite schema is initialized automatically.

Set server env/api.env as needed:

    RESEND_API_KEY=
    NOTIFICATION_EMAIL_FROM=
    PUBLIC_SITE_URL=https://your-production-origin
    WHATSAPP_ALERTS_ENABLED=false
    META_ACCESS_TOKEN=
    META_PHONE_NUMBER_ID=
    META_NOTIFICATION_TEMPLATE=
    META_GRAPH_VERSION=
    META_TEMPLATE_LANGUAGE=en
    CRICKET_EVENT_FEED_URL=
    DIGEST_HOUR_UTC=18

Meta template must have a single body text parameter matching the implementation. Email and WhatsApp cannot be verified live until provider setup is supplied. Keep credentials outside VITE variables. Restart API after settings change. API uses env/api.env; the earlier isolated WhatsApp bot uses env/whatsapp.env separately.

## Endpoints

GET /api/notifications; POST /api/notifications/preferences; POST /api/notifications/read; GET/POST /api/notifications/unsubscribe.
POST /api/admin/events; POST /api/admin/notifications/verify-whatsapp; POST /api/admin/jobs/run; GET /api/admin/analytics.
POST /api/analytics/events; GET /api/analytics/public.

## Verification

- Seven focused platform tests passed: owner isolation/admin gate, mocked email send/unsubscribe, event fanout/dedup, restart persistence/retry limits, phone verification reset, observation baseline/detection/staleness, analytics counts and scheduled auction/digest processing.
- Two desktop/mobile account tests passed, including saving signed-in notification preferences.
- Frontend and API typechecks passed.
- Public aggregate executed against cricfield-production successfully.
- Real external delivery, live feed ingestion and admin phone verification remain untested with production services.

Live local smoke: GET analytics/public returned HTTP 200 with confirmed count from Supabase, no-token admin returned 401, valid configured admin returned 200, and unauthenticated notifications returned 401. Worker enabled on restarted local API; no external messages sent.

Final browser checks: four additional desktop/mobile tests passed for admin access/error states and telemetry remaining off until explicit consent (six browser checks total for this increment). API/frontend final typechecks passed. Email idempotency contract checked against https://resend.com/docs/dashboard/emails/idempotency-keys . Meta template documentation was rate-limited during review; actual approved-template delivery remains a manual integration test.
