# Day 1 Report — Critical security and trust fixes

**Date:** 2026-10-14 · **Scope:** Day 1 only (security + trust). No Day 2 work (Scout ranking bugs, failing Step-3 tests, performance) was done.

**Preservation:**
- I checked git status before editing (277 entries; much uncommitted work).
- Every file I edited was backed up first, to the session scratchpad, and diffed afterwards.
- Nothing was reset, committed, deleted or overwritten. `sqlite.db` was untouched (timestamp still `Oct 11 00:15`).
- `dist/` was not rebuilt. The production-build check wrote to a scratch folder.

---

## 1. Findings (verified against current code)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| F1 | `POST /api/ipl/sync-csv` read any `filePath` from the request body, with no auth. A missing file returned an error message containing the path, which works as a file-existence oracle. | `artifacts/api-server/src/routes/csv-sync-route.ts` (old lines 6-36); `services/cricsheet-csv-sync.ts:38-43` (`fs.existsSync` / `fs.readFileSync(filePath)`) | High |
| F2 | The photo-pipeline admin pages were routed publicly at `/photo-pipeline` and `/admin/photo-pipeline`. On inspection the page is static (hardcoded progress numbers, no server calls), so the risk was exposure and misleading internal data, not data modification. | `ipl-analytics/src/App.tsx:64-65`; `pages/photo-pipeline-dashboard.tsx` | Low–Medium |
| F3 | The Gemini client's no-key/failure fallback returned pre-written text with invented statistics (e.g. “+18.4%”, “188.4”), labelled `gemini-1.5-flash (Calibrated Quant Engine)`. | `ipl-analytics/src/lib/gemini-client.ts` (old lines 104-150) | High (trust) |
| F4 | The Gemini key could come from `VITE_GEMINI_API_KEY`, which would compile it into the public JS bundle. It was also sent in the URL query string (`?key=`). | same file | Medium |
| F5 | `AIAnalystPanel` (not imported anywhere) contained canned answers with invented numbers behind an “Online” AI indicator. | `components/ai-analyst-panel.tsx` | Low (dead code, latent) |
| F6 | Misleading claims: an ad labelled “Official Analytics Partner”, and a tour card titled “12 AI Tactical Decision Engines”. | `pages/ai-analyst-ask.tsx`, `components/ai-mascot-guide.tsx` | Medium (trust) |
| F7 | Pulse showed “emotion” meters with `Math.random()` noise, and a sine-wave “Momentum Wave” under live team names, presented as data. | `pages/pulse.tsx:137,168,145-155` | Medium (trust) |
| F8 | The clip router returned whatever URL the LLM produced, with no check against the catalogue (hallucination / prompt-injection risk). It also sent the server key in the URL. | `api-server/src/routes/clip-router.ts` | Medium |
| F9 | Open CORS (`cors()`), no rate limiting, unbounded JSON bodies. | `api-server/src/app.ts` | Medium |
| F10 | `?refresh=true` let any visitor force fresh scraping of third-party sites. | `routes/live.ts` | Medium |
| F11 | Running the API from source crashed (`__dirname is not defined in ES module scope`, `app.ts:46`), which also blocked HTTP tests. | reproduced | Medium |
| **Handbook correction** | Handbook Ch. 9 says the Strategy Sim's Gemini call passes no simulation numbers. **That is wrong**: the prompt includes target, score, required rate and plan defend-probabilities (`ai-analyst-strategy-sim.tsx:161-171`). The output is still ungrounded free text. | | — |

---

## 2. Changes implemented

| File | Change |
|---|---|
| `artifacts/api-server/src/routes/csv-sync-route.ts` | Rewritten. Now admin-only (`requireAdmin`); accepts only a strict Zod body `{ matchId: /^\d{1,12}$/, filters? }`, so `filePath` is rejected. Resolves the file by id inside `ipl_csv/`. Errors are generic. |
| `artifacts/api-server/src/services/csv-dataset.ts` (new) | `resolveCricsheetCsv(matchId)`: numeric id only, with a containment check that the resolved file sits directly in `ipl_csv/`. |
| `artifacts/api-server/src/scripts/csv-sync-cli.ts` (new) | Offline replacement for the import workflow: `pnpm --filter @workspace/api-server exec tsx src/scripts/csv-sync-cli.ts <matchId>`. |
| `artifacts/api-server/src/lib/admin-auth.ts` (new) | Admin features exist only if `ADMIN_API_TOKEN` (≥ 24 chars) is set. Header `x-admin-token`, constant-time compare. 404 when disabled, 401 when wrong. |
| `artifacts/api-server/src/lib/rate-limit.ts` (new) | In-memory fixed-window limiter per client IP; returns 429 + `Retry-After` + `RateLimit-*` headers; bounded memory. |
| `artifacts/api-server/src/app.ts` | Five changes, listed below. |
| `artifacts/api-server/src/routes/live.ts` | Cache bypass (`refresh` / `bypassCache`) honoured only for admin requests. |
| `artifacts/api-server/src/routes/clip-router.ts` | `resolveModelClipChoice()`: the LLM may only pick a catalogue `clip_id`, and title/URL always come from the catalogue. The key is sent in the `x-goog-api-key` header. The `VITE_GEMINI_API_KEY` server fallback is removed. The query is capped at 200 chars. |
| `artifacts/ipl-analytics/src/lib/gemini-client.ts` | Rewritten. Fabricated fallback removed. Returns `{source:"unavailable", text:"", error}` when there is no key or the call fails. The key comes from localStorage only (never `VITE_*`) and is sent in a header. The system prompt forbids inventing numbers. |
| `artifacts/ipl-analytics/src/pages/ai-analyst-ask.tsx` | The Gemini tab shows an amber “not configured / failed” status. Output is labelled “unverified AI text”. The badge changed from “LIVE LLM” to “YOUR OWN KEY”, with an honest description. The ad label is now “Advertisement”. |
| `artifacts/ipl-analytics/src/pages/ai-analyst-strategy-sim.tsx` | A truthful unavailable banner (“simulation results below are unaffected”). The briefing is labelled unverified AI text, with a warning to check numbers against the simulation. |
| `artifacts/ipl-analytics/src/components/ai-analyst-panel.tsx` | Canned fake statistics removed; it now says it isn’t connected and points to the Ask page. “Online” changed to “Not connected”. |
| `artifacts/ipl-analytics/src/components/ai-mascot-guide.tsx` | “12 AI Tactical Decision Engines” is now “Data-Driven Decision Tools”, with an accurate description. |
| `artifacts/ipl-analytics/src/pages/pulse.tsx` | Random noise removed from the meters and heatmap. Momentum Wave and Pressure Map are labelled “Illustrative”. |
| `artifacts/ipl-analytics/src/App.tsx` | Photo-pipeline routes are rendered only when `import.meta.env.DEV` or `VITE_ENABLE_ADMIN_PAGES=true`. |
| `artifacts/api-server/package.json` | Added the `"test": "tsx --test test/*.test.ts"` script. |
| `artifacts/api-server/test/day1-security.test.ts` (new) | 16 regression tests (§3). |

The five `app.ts` changes:
1. A CORS allowlist: `CORS_ORIGINS` env, plus localhost outside production. The site itself is same-origin and unaffected.
2. `trust proxy` is set from `TRUST_PROXY`, or 1 hop in production, so rate limits see real client IPs.
3. JSON and urlencoded bodies are capped at 100 KB.
4. Rate limits: 600/min per IP for all of `/api`; 60/min for heavy endpoints (stats, simulations, ask, optimiser, clip routing, sync-csv). Both are configurable via `RATE_LIMIT_API_PER_MIN` and `RATE_LIMIT_HEAVY_PER_MIN`.
5. `__dirname` replaced with `fileURLToPath(import.meta.url)`, which fixes the source-run crash (F11).

---

## 3. Tests executed and actual results

| Command | Result |
|---|---|
| `artifacts/api-server`: `./node_modules/.bin/tsx --test test/day1-security.test.ts` | ✅ **16 / 16 pass** (5.8 s) |
| `scripts`: `tsx --test src/global/tests/*.test.ts src/scout/tests/*.test.ts` (existing suites, regression check) | ✅ 23 / 23 pass |
| `artifacts/api-server`: `tsc -p tsconfig.json --noEmit` | 2 errors, **both pre-existing** (`routes/scout.ts:123`, `unique_name`, a Day 2 item). No new errors. |
| `artifacts/ipl-analytics`: `npx tsc -p tsconfig.json --noEmit` | 11 errors, **all pre-existing** in `components/cricket3d/*`. No new errors. |
| Production build to a scratch folder (`vite build --outDir <scratch>`) | ✅ built. `admin/photo-pipeline` is absent from the bundle (0 files), and `generateCalibratedFallback` / “Calibrated Quant” are absent (0). |
| Live API from source on :5055 (previously crashed) | ✅ starts. See the four probes below. |
| Browser (test server :3055) | ✅ Gemini tab shows the amber “Gemini is not configured…” status; Pulse shows the “Illustrative” labels; no console errors. |

Live probes against the :5055 server:
- The sync-csv traversal attempt returned `404 {"error":"not_found"}` and didn't echo the path.
- An `Origin: https://evil.example` request got no `Access-Control-Allow-Origin` header.
- `POST /api/ask` still answers.
- `?refresh=true` now returns cached data in 3 ms.

What the 16 tests cover:
- **sync-csv:** 404 when disabled; 401 with no or wrong token; `filePath` bodies rejected (including `../../package.json`, `/etc/passwd`, `C:/Windows/win.ini`) with no existence-oracle text; traversal-style `matchId`s rejected; valid admin request by id works.
- **Resolver:** containment checks.
- **Admin auth:** short tokens are treated as not configured.
- **CORS:** unknown origin denied, localhost allowed.
- **Rate limiter:** returns 429 + `Retry-After`; headers present on the real API.
- **Clip router:** hallucinated id/URL rejected, catalogue URL enforced, long query rejected.
- **Gemini, no key:** unavailable result, empty text, no digits, no network call.
- **Gemini, API failure:** unavailable result with no substitute text.
- **Gemini, success:** the key travels in a header, not the URL.
- **Source scan:** none of the fabricated strings, the “Official Analytics Partner” label, or `Math.random` in Pulse remain, and the admin routes are gated.

**Not executed:** a negative control running the new tests against the old code. The old route would have answered 500/200 instead of 404, but I did not run it. The Step-3 suite was not re-run, since it was already failing for reasons outside Day 1 scope and these changes don’t touch stats code.

---

## 4. Remaining risks (not fixed today)

1. **CSV sync produces all-zero metrics.** This is a pre-existing functional bug. `CricsheetCSVParser` expects Cricsheet CSV2 headers, but `ipl_csv/` holds the older `ball,…` format, so match 1082591 gives 324 balls with 0 runs. The route was never producing real numbers. Fix or retire it later.
2. **Auction game state** is a global in-memory singleton, and `/api/auction/reset` is public. Restricting it would break the game UI, so it needs per-session state (Day 2+).
3. **Rate limits are per process.** Autoscaled instances each keep their own counters, so a shared store is needed for real multi-instance limits. If `trust proxy` is set wrongly for the host, all users could share one IP bucket. Verify `TRUST_PROXY` on the real host.
4. **The Pulse refresh button** now gets cached data (≤ 30 s old) instead of forcing a scrape; this is intended.
5. **Gemini** is still browser-side and ungrounded: the key sits in the visitor’s localStorage and the text is unverified. The proper fix is a server-side, grounded LLM proxy (Day 2+ / the agent plan).
6. **Unsourced numbers remain in editorial content** (`lib/content-engine-100.ts`, e.g. “14,200 posts per second”) and in the static photo-pipeline dashboard. They aren’t AI output, but they need sourcing or removal.
7. Error messages in legacy `routes/ipl.ts` still return `err.message`.
8. Scraping of Cricbuzz/ESPN and unlicensed images are unchanged (legal risk).
9. `.env` is still tracked in git. It holds only public IDs, but untrack it when convenient.

---

## 5. Manual verification steps

1. Start the API from source: `pnpm --filter @workspace/api-server exec tsx src/index.ts` (with `PORT=5055`). It should start without the `__dirname` error.
2. Send the old attack:
   ```bash
   curl -s -X POST -H "content-type: application/json" -d "{\"filePath\":\"../../package.json\"}" http://localhost:5055/api/ipl/sync-csv
   ```
   Expect `{"error":"not_found"}` with status 404.
3. Check CORS:
   ```bash
   curl -s -D - -o /dev/null -H "Origin: https://evil.example" http://localhost:5055/api/healthz
   ```
   Expect no `Access-Control-Allow-Origin` line, and `RateLimit-*` headers present.
4. Open `/ai-analyst/ask?tab=gemini` with no key saved and submit a prompt. Expect the amber “Gemini is not configured…” box, with no tactical text and no numbers.
5. Open `/ai-analyst/strategy-sim`, run a simulation, then click “Ask Gemini (optional, your key)”. Expect the amber unavailable banner.
6. Open `/pulse`. The Momentum Wave and Pressure Map show “Illustrative”, and the meters no longer change on refresh.
7. Run `pnpm build` for the web app; in the production build `/photo-pipeline` should show Not Found. Set `VITE_ENABLE_ADMIN_PAGES=true` to re-enable it.
8. Run the tests: `pnpm --filter @workspace/api-server run test` should give 16/16 pass.
9. Optional admin path: set `ADMIN_API_TOKEN` (24+ chars), then `curl -X POST -H "x-admin-token: <token>" -H "content-type: application/json" -d "{\"matchId\":\"1082591\"}" .../api/ipl/sync-csv` should return 200.

---

## 6. Five technical concepts to learn from today

1. **Path traversal and allow-listing.** Why “accept a path” is dangerous, and why “accept an id, map it to a known folder, verify containment” is safe (`csv-dataset.ts`).
2. **Authentication basics for admin endpoints.** Shared-secret tokens, constant-time comparison (`timingSafeEqual`), and returning 404 vs 401 so you don’t advertise hidden routes.
3. **CORS.** What it protects (browsers reading cross-origin responses), what it does not (curl and servers ignore it), and why same-origin apps need no CORS headers.
4. **Rate limiting.** Fixed-window vs token-bucket, per-IP keys, `trust proxy` and `X-Forwarded-For` spoofing, why in-memory limits don’t work across instances, and the `429` / `Retry-After` semantics.
5. **Honest AI UX and LLM output validation.** Never substitute fabricated content for a failed model call; label ungrounded text; let the model *choose* from known options (catalogue ids) instead of *producing* URLs or numbers. This is the basis for the grounded franchise agent you want to build.
