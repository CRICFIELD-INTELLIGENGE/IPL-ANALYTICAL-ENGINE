# Social sign-in and account design — 2026-10-29

The account screen now has a responsive cricket field illustration, Google/GitHub/Discord sign-in options, email-link fallback, profile editing, and logout. Existing navigation and the Supabase singleton are retained. No database migrations or production authentication settings were changed.

Provider availability is read from the project's public Auth settings. Disabled methods show Coming soon; failed checks show Unavailable with a retry action. Enabled methods call signInWithOAuth and return to the current origin plus the app base path and /account. OAuth cancellation and email-link errors show safe feedback without rendering provider error descriptions.

## Enable social sign-in

1. Create the provider's OAuth application (Google Cloud web application, GitHub OAuth App, or Discord application).
2. Register https://jilxgxuamfloacsfadso.supabase.co/auth/v1/callback as the provider callback URL.
3. Add the client ID and client secret to the matching provider in Supabase Authentication → Sign In / Providers. Secrets belong only in the dashboard, never VITE variables or frontend files.
4. For Google, configure consent branding, audience/test users, and basic openid/email/profile scopes. Set authorized JavaScript origins to the actual development and production origins.
5. Add each actual app /account URL to Supabase's redirect allowlist (including any configured base path), and set the production Site URL.
6. Once enabled, reload /account: the provider button becomes available. Complete a real consent round trip, reload the account page, save a profile, and sign out before release.

Reference: https://supabase.com/docs/guides/auth/social-sign-in/auth-google

Live provider configuration could not be rechecked from this environment because the Supabase hostname did not resolve. Prior verification found these providers disabled. No real OAuth consent round trip or email was sent during this change. These buttons implement sign-in, not linking additional identities to an existing account.

## Design decisions

Use CricField's existing dark navy editorial palette, a restrained sage accent, serif cricket headline, and a purpose-built field diagram. Desktop uses two columns; mobile reduces the illustration to a compact heading and keeps every sign-in method visible. Explicit labels, native buttons, focus indicators and live feedback preserve keyboard usability.

## Verification

- Frontend TypeScript check: passed.
- Focused Playwright suite: 20 passed (10 cases on desktop and mobile). Includes email success/failure, expired link, session reload/logout, each provider's OAuth destination and redirect, disabled providers, retry after settings failure, and cancelled OAuth.
- Command from artifacts/ipl-analytics: pnpm exec playwright test --config e2e/account-check.config.ts
- Desktop and mobile screenshots reviewed: account-desktop.png and account-mobile.png. The existing cookie banner remains in place.
- Tests mock all Supabase traffic; they do not establish real provider login or email delivery.
