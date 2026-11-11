# CricField footer, ads and visitor measurement

## What changed

The existing footer, consent banner, ad components, Express analytics routes and Supabase account-count integration are reused. There is one app-level usage collector, including Scout Lab. The footer now includes Terms, Privacy settings, copyright and links to six league filters. Existing About, Contact, data-source and configured social links remain.

Ad placeholders no longer impersonate sponsorships. Legacy slot numbers are only placement keys; they must be mapped to actual units. Ads default to disabled. Publisher-ID format validation, a configuration switch, site consent, and a completed certified-CMP TCF signal gate ad requests. No approval, ownership or earnings have been asserted.

## Frontend configuration

Set these in the frontend build environment, then rebuild. These values are public, not secrets.

```dotenv
VITE_ADSENSE_CLIENT=
VITE_ADSENSE_ENABLED=false
VITE_ADSENSE_SLOTS={}
VITE_GA_MEASUREMENT_ID=
```

- `VITE_ADSENSE_CLIENT`: your verified 16-digit publisher number, optionally prefixed with `pub-` or `ca-pub-`.
- `VITE_ADSENSE_ENABLED`: leave `false` until your real domain is approved and consent setup has been verified. This switch is not an approval check.
- `VITE_ADSENSE_SLOTS`: JSON mapping the existing placement keys to your real 10-digit display-ad unit IDs. Example structure: `{"5938201746":"YOUR_REAL_UNIT_ID"}`. The text placeholder fails validation and will not request an ad. Use `5938201746` for the existing home placement. Other keys are in existing `AdVessel` call sites; configure only reviewed placements.
- `VITE_GA_MEASUREMENT_ID`: the `G-...` ID for your GA4 web stream. Leave blank to disable GA.

The Vite build generates `ads.txt` and the AdSense verification meta tag from the same publisher setting. With no valid ID, `ads.txt` contains a comment, no seller entry. For a subpath deployment, publish the generated `ads.txt` at the domain root as well. Do not deploy the source public folder as the finished app.

## AdSense dashboard and consent setup

1. Add the real domain in AdSense, complete ownership/account checks and request review. A configured ID does not mean the site is approved.
2. Confirm the generated verification meta tag and root `ads.txt` match your account. Use the account's seller record if Google supplies a different required record.
3. Choose and configure a Google-certified consent management platform. Deploy its provider-generated script independently of the ad loader so its TCF `__tcfapi` is available before ads. Do not place CMP startup behind the ad-consent gate. Publish its privacy-settings control, privacy policy URL, vendor and purpose choices, and any regional messages required by your deployment.
4. The current integration deliberately fails closed without a loaded CMP signal, even outside regulated regions. For applicable TCF regions it requires Google vendor 755 and affirmative purpose consents 1, 2, 3, 4, 7, 9 and 10. This is a conservative full-consent path; non-personalized and limited-ads paths are not implemented. A CMP reporting `gdprApplies=false` still requires CricField's Google-services choice.
5. Create responsive display units and map only placements you have reviewed. Keep Auto ads off for this rollout: automatic overlays and additional placements are outside the tested layout. Ads must not cover search, player cards or navigation. Do not click your own live ads; test layout with mocks.
6. Review the real site's content, traffic and policies, then enable ads and rebuild. Check AdSense's policy center and consent diagnostics. Earnings and ad performance remain in the actual AdSense dashboard; this app does not invent them.

The existing cookie banner is not a certified CMP. Google Consent Mode alone is also not a substitute. See [Google CMP requirements](https://support.google.com/adsense/answer/13554116), [site connection](https://support.google.com/adsense/answer/7584263), and [AdSense program policies](https://support.google.com/adsense/answer/48182).

## Visitor data and dashboard

- First-party usage is optional and off by default. The footer checkbox controls it independently of Google services. Changes propagate across open tabs.
- The existing Express endpoints `/api/analytics/events`, `/api/analytics/public` and `/api/admin/analytics` are reused. Only broad section names are sent; search text, full URLs, account IDs and page titles are not included in these events.
- A random identifier lives in session storage. The backend stores a daily hash, not the raw identifier. This is pseudonymous measurement, not guaranteed anonymity.
- The admin page `/admin/analytics` shows 30-day views, recently active opted-in browser sessions, daily views/session estimates, and popular sections. UTC dates are used. A tab, browser, device or new day can create another session; these counts are not unique humans and are not bot-verified. There is no fabricated all-time total.
- Views count route visits; heartbeats do not increase them. Navigation that changes only filters on the same route is not a new page view. Collection is separate from footer mounting, and StrictMode does not duplicate initial views.
- Events older than 30 days and stale presence rows are removed during collection and metrics reads. If the server is entirely idle, cleanup waits for the next request; arrange a daily authenticated dashboard read if you need scheduled deletion. Apply a matching retention rule to backups.
- The existing SQLite `PLATFORM_DB_PATH` must point to persistent private storage. Multiple application replicas must not use separate local databases if you want a combined count; a shared transactional store would need a separate migration. No live database was changed here.

## Server configuration and secrets

```dotenv
ADMIN_API_TOKEN=
PLATFORM_DB_PATH=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Generate a strong random `ADMIN_API_TOKEN` of at least 24 characters. Keep it server-side, never in a `VITE_` variable or source control. Enter it only on the protected admin page over HTTPS; the existing backend checks the `x-admin-token` header. Without a token, admin endpoints return 404. Restrict admin access at the host or reverse proxy as appropriate.

The Supabase URL and publishable key are not service-role secrets. Existing frontend account configuration is unchanged. Never put a Supabase service-role/secret key in the frontend. Use the correct project and apply the existing migration `supabase/migrations/202610290003_public_registered_count.sql` if it is not already installed. It exposes a count of confirmed, non-deleted accounts, not account records. Test its grants in Supabase before publishing. Missing/invalid RPC responses are shown as unavailable, not as zero. No live Supabase project or migration was modified or verified by this work.

## GA4 setup

Create/select a web stream for the real domain and configure its measurement ID. Disable Enhanced Measurement automatic page views and history-change page tracking because the app sends manual route views. Disable other automatic measurements and user-provided-data collection unless separately reviewed; they can collect data outside this integration. Configure retention and access in the GA dashboard. Test Realtime/DebugView using consented test visits. Google-service refusal reloads the page to stop previously loaded third-party code; it cannot delete data already collected by Google.

## Verification and remaining limits

Local verification uses mocked Google and API responses; no live ads or visitor counts were generated. See VERIFICATION.md for final results. Deployment, real CMP behavior, AdSense approval/ad fill, GA ingestion and the live Supabase RPC still require owner dashboard setup. Terms and privacy text should be checked against the actual operator, hosting and business practices before release.
