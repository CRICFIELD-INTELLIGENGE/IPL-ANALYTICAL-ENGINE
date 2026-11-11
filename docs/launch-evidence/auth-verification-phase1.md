# CricField authentication verification: Phase 1 (2026-10-29)

Project: `cricfield-production` (`jilxgxuamfloacsfadso`). No production Auth settings were changed. No emails were sent.
No test identities were left behind (`auth.users` = 0, `profiles` = 0 before and after).

## How CricField signs people in

Passwordless email links only (`signInWithOtp`, implicit flow, supabase-js 2.118.0). Entering an email either signs in
an existing user or creates a new one. There are no passwords, so **password registration and password reset do not
exist in this app**. They are not applicable, not failures. One client exists: `src/lib/supabase.ts`
(`getSupabase()`), and it refuses secret / service-role keys. The browser key is an `sb_publishable_` key.

## Results

| Check | Result | Evidence |
|---|---|---|
| Email provider enabled, sign-ups open | PASS | `GET /auth/v1/settings`: `email: true`, `disable_signup: false` |
| Email confirmation required for new users | PASS | `mailer_autoconfirm: false` |
| Other providers (OAuth, phone, anonymous) off | PASS | all `false` in settings |
| Sign-in link request sends `redirect_to = <origin>/account`, `create_user: true` | PASS (mocked) | `e2e/account.spec.ts` test 1 |
| Sign-in request failure (e.g. rate limit) shows retry message | PASS (mocked) | test 2 |
| Expired / invalid email link | **FAILED, then FIXED** | Before: silent sign-in form, error left in URL. Now shows "That sign-in link is invalid or has expired…" and clears the hash (`account.tsx`). Test 3 |
| Session persists across reload | PASS (mocked) | test 4: stored session reloads signed in |
| Profile request is scoped to own id | PASS (mocked) | test 4: every `profiles` query is `id=eq.<own uid>` |
| Sign out clears stored session, survives reload | PASS (mocked) | test 4: `/logout` called, storage key removed, form after reload |
| Anonymous REST access to `profiles` | PASS | live: `SELECT` 401, `INSERT` 401 `permission denied` |
| RLS on, owner-only select/insert/update policies, no delete, no anon grants | PASS | catalog query matches `202610280001_profiles.sql` |
| Cross-account isolation (A cannot see, update, re-key into, insert as, or delete B; B unchanged; 80-char cap) | PASS | `supabase/tests/profiles_rls.sql` → `ALL_PASSED (rolled back)` |
| Security advisors | PASS | 0 findings |
| Typecheck | PASS | `pnpm run typecheck` exit 0 |

The 4 mocked browser tests passed (desktop; skipped on mobile by design). They were run against the dev server:
`E2E_BASE_URL=http://localhost:3001 pnpm exec playwright test --config e2e/playwright.config.ts e2e/account.spec.ts`.
They abort any Supabase call they do not mock, so they never reach the real project.

## Untested (needs a real inbox)

- Real email delivery of the confirm-signup and magic-link emails.
- Clicking a real link: confirmation → redirect → signed-in session from a real token.
- Real token refresh after expiry, and a real `/logout` against the server.
- Whether Supabase accepts or rewrites the `redirect_to` (depends on the allowlist below).

Doing these means sending real email from the production project to an address you control. I did not do this
without your approval.

## Needs manual action in the Supabase Dashboard (Authentication → URL Configuration / Emails)

The Site URL and redirect allowlist cannot be read with the tools available here, so check them by hand.

1. **Redirect URLs**: the app asks for `<current origin>/account`. A URL that is not allowlisted silently falls back to
   the Site URL. Add exactly:
   - `http://localhost:3000/account` (main dev server, `.claude/launch.json` `web-3000`)
   - `http://localhost:3055/account` only if you sign in on the `decision-web` dev server
   - `https://<production domain>/account` once known. **No production origin is recorded anywhere in the repo.**
     If `BASE_PATH` is not `/` in production, include it (`https://<domain><BASE_PATH>account`).
2. **Site URL**: set it to the production origin, not localhost, before launch.
3. **SMTP**: Supabase's built-in email sender is meant for testing and is heavily rate-limited. Configure custom SMTP
   before real users sign up.
4. **Email templates**: keep `{{ .ConfirmationURL }}` in the Confirm signup and Magic Link templates. The app uses
   the implicit flow and reads the token from the URL hash.
5. **Account deletion**: still not implemented (carried over from `SUPABASE_SETUP.md`).

## Files changed in this phase

- `artifacts/ipl-analytics/src/pages/account.tsx`: expired/invalid-link message (one line, UI otherwise unchanged)
- `artifacts/ipl-analytics/e2e/account.spec.ts`: new, 4 mocked auth tests
- `supabase/tests/profiles_rls.sql`: new, re-runnable isolation check (always rolls back)
- Migrations untouched.
