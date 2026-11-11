# CricField AI Analyst backend

POST /api/ai/analyst accepts only { "prompt": "Most runs in IPL 2025" }. The existing AI tab now calls this route and renders expandable server-retrieved evidence. The existing warehouse Ask flow and legacy commentary endpoint remain available.

## Controlled tools

- statistics: existing natural-language parser -> typed runStatQuery, capped at 10 rows. Supports the parser's existing player/season/team comparisons; unsupported questions return clarification data.
- player_summary: bounded player search; a unique match returns summary, ambiguous matches return candidates.
- auction_records: sourced IPL 2027 desk snapshot through its existing read-only summarizer. No auction log writes or invented sales.

The model cannot supply SQL, file paths, URLs, credentials or account queries. Zod rejects unknown tools, extra fields and oversized arguments. Maximum four tool executions and four model rounds; one overall 25-second provider signal, bounded output, bounded evidence size, two concurrent requests, five requests/minute/IP and a daily per-process question budget. Requests are not authenticated yet; use single-process deployment or enforce shared quotas/access control at the gateway before broader public rollout. Provider calls per question can be up to four. Existing reverse-proxy trust must be configured correctly.

Answers include evidence IDs, tool names and source API paths, plus raw retrieved data. These establish retrieval provenance, not independent verification of every generated sentence. The UI labels AI interpretation as fallible. Tool records may lag current events; the service does not claim live coverage.

## Enable

Set only on the API server:

    AI_ANALYST_ENABLED=true
    OPENROUTER_API_KEY=<server secret>
    OPENROUTER_MODEL=openrouter/free
    AI_ANALYST_DAILY_LIMIT=100

Then restart the API. Never use VITE variables for credentials. When disabled/missing configuration, route returns 503. No paid request was made during implementation. Real model tool selection/response quality and live OpenRouter API connectivity remain unverified.

Tests cover evidence propagation, rejection of unknown/SQL tools and oversized arguments, refusal of evidence-free responses, bounded tool loop and provider failure. Reference: https://openrouter.ai/docs/guides/features/tool-calling

Validation: API and frontend TypeScript checks passed; all five focused analyst service tests passed. Existing Strategy Simulation calls that supply context retain the legacy commentary route. No live model request was sent.

Provider updated to OpenRouter free-only routing. OPENROUTER_MODEL defaults to openrouter/free; only that router or vendor/model:free IDs accepted. Zero prompt/completion price constraints and require_parameters are sent on each request. No paid fallback list. Legacy commentary uses the same free gateway. Free-tier outages/rate limits return an error; no automatic paid fallback. Existing enable flags remain required.
