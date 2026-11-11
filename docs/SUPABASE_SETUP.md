# CricField accounts

The Vite SPA uses `@supabase/supabase-js`. The requested `@supabase/ssr` package is installed for future server rendering; this SPA does not require a server cookie client.

1. Connected project: `cricfield-production` (`jilxgxuamfloacsfadso`), selected by the user. Its public API URL and publishable key are configured in the ignored frontend `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `artifacts/ipl-analytics/.env.local`. Use the project's public publishable key. Never put service-role, secret or database credentials in a VITE variable.
3. Applied `supabase/migrations/202610280001_profiles.sql`: profiles table with verified row-level security and owner-only select/insert/update. Anonymous grants are absent. Applied the follow-up helper permission migration; security advisors now report no findings. Cricket warehouses were not modified.
4. Enable email authentication; configure the Site URL and allow the exact redirect `http://localhost:3000/account` for development, plus the production `/account` URL when known. Ensure confirmation emails and SMTP are configured appropriately.
5. Restart Vite; open `/account`. The header Account link appears only when configuration is supplied.
6. Verify a sign-in link, profile save, persistence across reload and sign-out. With two test accounts, verify account B cannot select or update account A's profile. These remote checks are not yet executed without project access.

Account data: email/identity is held by Supabase Auth; `public.profiles` stores only ID and display name. Existing shortlist, games and team preferences remain browser-local; no silent upload is performed. The privacy page describes optional accounts. Implement and document an account-deletion process before launch.

Reference: https://supabase.com/docs/guides/auth/quickstarts/react and https://supabase.com/docs/guides/database/postgres/row-level-security
