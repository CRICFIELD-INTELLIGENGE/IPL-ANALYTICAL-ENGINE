# Hybrid hosting: Vercel + Windows laptop analytics (30 days)

Status on 2026-11-17: code, scripts and tests are done on branch `feature/laptop-analytics-backend`. **Nothing is
activated in production.** Activation needs your Cloudflare, Vercel and Windows permissions (steps below).

## 1. Audit: what actually runs in production

| Piece | Where it runs | Data |
|---|---|---|
| Website (`@workspace/ipl-analytics`) | Vercel static build | `public/data/*.json` snapshots |
| `/api/stats/*`, `/api/ipl/*`, `/api/scout/*` | One Vercel function, `api/warehouse-preview.mjs` (rewrites in `vercel.json`) | Downloads a **full SQLite snapshot from Turso** (`/export`) into `/tmp` on every cold start |
| Every other `/api/*` (retention, ask, arcade, platform, decision, …) | **Not deployed.** Vercel returns `index.html`; those pages use static fallbacks | — |
| `artifacts/api-server` (Express 5) | Only on a developer machine (`:5000`) | `sqlite.db`, `global.db` |

Turso dependency: the function needs `TURSO_IPL_*` (tables matches, innings, deliveries, players, seasons) and `TURSO_SCOUT_*` (global warehouse). Each cold start reads the whole database through Turso, which is why read quota drains.

**Finding (2026-11-17): the production stats API is already down.** `https://www.cricfield.in/api/stats/query`, `/api/ipl/overview` and `/api/scout/rankings` return `503 ipl_warehouse_unavailable` / `global_warehouse_unavailable`. Vercel logs show `Warehouse preview initialization failed Error`. The function logged only the error *name*, so the cause (quota, missing variable, Turso outage) is not visible; this branch logs the message too. The site keeps working on its static fallbacks, but live slicing and Scout Lab queries fail.

Endpoints the laptop serves (allowlist in `artifacts/api-server/src/lib/analytics-routes.ts`): the 14 above, plus `/api/stats/pressure-reliability`, `/api/ipl/team-analytics` and `/api/ipl/venue-analytics`, which were never served in production before. All are `GET`, read-only, and use immutable cricket data. Nothing that writes, authenticates users or calls an AI provider is exposed.

## 2. Routing

```
Browser ──► www.cricfield.in (Vercel)
              │  /api/stats|ipl|scout/*  →  api/warehouse-preview function
              │        CRICFIELD_ANALYTICS_MODE
              │          turso (default) ──► Turso snapshot (unchanged behaviour)
              │          laptop ───────────► https://api.cricfield.in ─┐  (503 if the laptop is down)
              │          laptop-then-turso ► laptop, else Turso path   │
              ▼                                                         │ header x-cricfield-analytics-key
                                                    Cloudflare Tunnel (outbound only, no open ports)
                                                                        ▼
                                          Laptop: node dist/index.mjs on 127.0.0.1:5100, ANALYTICS_GATE_KEY set
                                          → only the allowlist, only with the key, read-only sqlite.db + global.db
```

- **Vercel** forwards one attempt with a 25 s timeout and no retries. It relays JSON only, and a tunnel HTML error page counts as a failure. Successful responses get `s-maxage=600, stale-while-revalidate=86400`, so repeated slices come from Vercel's CDN without touching the laptop. Errors are never cached. The browser's IP is forwarded so per-user rate limits still work.
- **Laptop gate** (`src/lib/analytics-gate.ts`): constant-time key check, allowlist, `GET` only, URL ≤ 2 KB, at most 6 requests in flight (beyond that, an explicit `503 analytics_backend_busy`). `CRICFIELD_DB_READONLY=1` is required. Requests to `/`, `/data/*`, admin and AI routes get a JSON 404. `/api/healthz` is public and says only `ok`. `/api/analytics/health` (keyed) reports databases, memory, CPU and counters.
- **Limit worth knowing:** delivery-level queries are synchronous and CPU-bound. One Node process runs them one at a time, so concurrency only queues requests; it never runs them in parallel. The in-flight cap bounds that queue.

## 3. Environment variables

Laptop: `%LOCALAPPDATA%\CricField\analytics.env.ps1`, outside Git. Template: `deploy/windows/analytics.env.example.ps1`.

| Name | Where | Value |
|---|---|---|
| `ANALYTICS_GATE_KEY` | laptop | 64-char random key from `deploy\windows\new-key.ps1` |
| `CRICFIELD_TUNNEL_NAME` | laptop | `cricfield-analytics` |
| `CRICFIELD_PUBLIC_URL` | laptop | `https://api.cricfield.in` (only used by `health.ps1`) |
| `CRICFIELD_ANALYTICS_MODE` | Vercel | `turso` (default) · `laptop` · `laptop-then-turso` |
| `CRICFIELD_ANALYTICS_ORIGIN` | Vercel | `https://api.cricfield.in` |
| `CRICFIELD_ANALYTICS_KEY` | Vercel | the same key as `ANALYTICS_GATE_KEY` (mark it Sensitive) |

`common.ps1` sets the fixed values: `CRICFIELD_DB_READONLY=1`, `NODE_ENV=production`, `PORT=5100` and both database paths.

## 4. Activation (needs your permissions)

1. **Build** (any terminal, in the repo): `pnpm install`, then `pnpm --filter @workspace/api-server run build`.
2. **Key:** run `powershell -File deploy\windows\new-key.ps1`. Copy `analytics.env.example.ps1` to `%LOCALAPPDATA%\CricField\analytics.env.ps1` and paste the key there.
3. **Cloudflare** (needs your account; `cricfield.in` must be a zone in it):
   - `winget install --id Cloudflare.cloudflared`
   - `cloudflared tunnel login`
   - `cloudflared tunnel create cricfield-analytics`. Note the tunnel id.
   - **Check DNS first:** in the Cloudflare dashboard, confirm `api.cricfield.in` doesn't already exist. If it does, pick another hostname, e.g. `analytics.cricfield.in`, and use it everywhere below.
   - `cloudflared tunnel route dns cricfield-analytics api.cricfield.in`
   - Copy `deploy\windows\cloudflared.example.yml` to `%LOCALAPPDATA%\CricField\cloudflared.yml` and fill in the tunnel id and your user name.
4. **Start on boot** (from an *Administrator* PowerShell, for start-without-login):
   - `powershell -ExecutionPolicy Bypass -File deploy\windows\install-tasks.ps1 -AtStartup -BackupDestination D:\CricFieldBackups`
   - Use another drive or a synced folder for backups; the C: drive has about 23 GB free.
   - Then `Start-ScheduledTask "CricField Analytics API"; Start-ScheduledTask "CricField Tunnel"`.
5. **Verify:** `powershell -File deploy\windows\health.ps1`. Every line must pass, including both tunnel probes.
6. **Load check** (optional): `node deploy\windows\load-test.mjs --key <key> --distinct-clients`.
7. **Vercel preview first:**
   - Set `CRICFIELD_ANALYTICS_ORIGIN`, `CRICFIELD_ANALYTICS_KEY` and `CRICFIELD_ANALYTICS_MODE=laptop-then-turso` for **Preview** only, then redeploy the branch.
   - Open the preview's `/stats` and Scout Lab. Responses should carry `X-CricField-Backend: laptop`.
8. **Production:** set the same three variables for Production, then redeploy. Use `laptop` if Turso is still unavailable, or `laptop-then-turso` to keep Turso as a safety net.

Keep the laptop on mains power. In Power Options, set sleep to Never on AC: a sleeping laptop drops the tunnel, and Vercel then returns 503 (or uses Turso, in `laptop-then-turso` mode).

## 5. Rollback

- **Instant:** in Vercel, set `CRICFIELD_ANALYTICS_MODE=turso` (or delete it), then redeploy. Behaviour is exactly as before this branch. No other change is needed.
- **Code:** revert the merge commit. The Turso configuration was never removed.
- **Laptop:** `powershell -File deploy\windows\stop-analytics.ps1 -Uninstall` stops and removes the tasks. `cloudflared tunnel delete cricfield-analytics` removes the tunnel; also remove its DNS record.

## 6. Recovery runbook

| Event | What happens | Action |
|---|---|---|
| Laptop restart | Tasks start at boot (`-AtStartup`) | Run `health.ps1` after login |
| Internet drop | `cloudflared` reconnects by itself; the supervisor restarts it if it exits | none |
| Backend crash | Supervisor restarts it with 5 s → 5 min backoff; Task Scheduler restarts the supervisor | `health.ps1 -Logs 50` |
| Tunnel failure | Vercel returns 503, or the Turso fallback | `Restart-ScheduledTask "CricField Tunnel"` |
| Database corruption | `health.ps1` shows degraded; queries fail | `stop-analytics.ps1`, then `backup-databases.ps1 -Restore <file> -Target sqlite.db` (or `global.db`), then start the tasks |
| Bad Vercel deploy | — | Vercel → Deployments → previous → Promote (or the rollback above) |

## 7. After 30 days: back to cloud hosting

The laptop runs the same Express bundle that any Node host can run:
- Copy `sqlite.db` and `global.db` to the host's disk (they're read-only).
- Set the same `ANALYTICS_GATE_KEY`, `CRICFIELD_DB_READONLY=1`, `CRICFIELD_DB_PATH`, `CRICFIELD_SCOUT_DB_PATH` and `PORT`.
- Point `CRICFIELD_ANALYTICS_ORIGIN` at the new host's URL.

A small always-on VM or container with 2 vCPU and 2 GB RAM fits the measured footprint (about 300 MB RSS). Alternatively, re-upload the rebuilt `global.db` to Turso and set the mode back to `turso`. That restores the per-cold-start snapshot reads, so check the quota first.

## 8. Measured on this laptop (2026-11-17)

These numbers are from a local loopback test of the real bundle (`node dist/index.mjs`, gated, read-only), with no tunnel or Vercel in between. Add network time for real users. Each level ran 40 requests over the workload in `load-test.mjs`:
- leaderboards
- death overs
- season range
- Kohli vs Rashid
- venue
- Pressure Reliability
- PSL and SMAT scout rankings
- a chase-state query

| Concurrency | Mixed avg / p95 (ms) | Errors | Uncached slices avg / p95 (ms) | Server RSS |
|---|---|---|---|---|
| 1 | 196 / 1,296 | 0 | 49 / 71 | ~280–360 MB |
| 5 | 715 / 1,459 | 0 | 152 / 201 | |
| 10 | 1,127 / 2,361 | 0 | 222 / 288 | |
| 25 | 2,237 / 3,343 | 0 | 395 / 708 | 289–376 MB |

- Server CPU stayed at about 100% of one core: queries are serialized.
- From a single IP the heavy rate limit (60/min) returned 429s at 25 concurrent. That is the intended per-client limit; the table uses distinct client IPs, as real browsers arrive through Vercel.
- First (cold) queries are slower: the first full-season delivery query took 3–5 s while warming caches.
- 25 concurrent users with p95 ≈ 3.3 s is the highest level measured. Nothing beyond it is claimed.

## 9. Tests

- `artifacts/api-server/test/analytics-gate.test.ts` covers: public liveness, key rejection, allowlist-only, keyed query, keyed health, and the busy cap.
- End to end, the real Vercel bundle in `laptop` mode was run against the real laptop bundle. Checked: forward with key; 404 for non-allowlisted paths; 401 without key; 404 for the SPA root; validation 400s relayed uncached; 503 when the laptop is down; `laptop-then-turso` falls back to the snapshot path.
- Backups: `VACUUM INTO` copy, then `integrity_check`, then SHA-256 into a manifest. A second run skips unchanged databases.
- All PowerShell scripts parse under Windows PowerShell 5.1.
