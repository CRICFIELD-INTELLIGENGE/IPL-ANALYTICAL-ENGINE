# Published Scout AI setup

CricField uses a server-side search-and-cite pipeline inspired by https://github.com/serpapi/local-llm-web-search. No upstream source code was copied. Cricket statistics come from the read-only warehouse; optional web snippets are separately labelled W1 etc. Web snippets are not verified match records.

## Hosted model (Cloudflare Workers AI)

Set these on the hosted API service, not the frontend:

```dotenv
NODE_ENV=production
AI_PROVIDER=cloudflare
AI_ANALYST_ENABLED=true
CLOUDFLARE_ACCOUNT_ID=<Cloudflare account ID>
CLOUDFLARE_API_TOKEN=<server secret with Workers AI access>
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
AI_ANALYST_DAILY_LIMIT=100
```

The existing Express API calls Workers AI over HTTPS; it does not itself become a Cloudflare Worker. Host the API on a Node-compatible service with the cricket warehouse files available. Publish the frontend with /api routed to that service; the frontend uses same-origin BASE_URL/api requests. Do not deploy the SQLite/Node warehouse backend directly to Workers without adapting its runtime and storage.

Alternatively set AI_PROVIDER=openrouter, OPENROUTER_API_KEY and OPENROUTER_MODEL=openrouter/free. Availability and provider quotas are external constraints. A free tier does not guarantee unlimited requests.

## Optional current web evidence

```dotenv
SCOUT_WEB_SEARCH_ENABLED=true
SERPAPI_API_KEY=<server secret>
```

SerpApi is separate from the LLM provider and may require a paid plan after its allowance. Without a key, database scouting continues and reports web search as unavailable. The planner makes at most one bounded search per question. Result links and snippets are shown with citations; arbitrary websites are never fetched by this server.

## Verify after configuration

1. GET /api/scout/analyst/status: enabled and modelConfigured must be true; provider should be cloudflare. webConfigured is optional.
2. Ask Scout Lab: Find IPL death-over batters with strike rate above 170 and at least 120 balls. Check S1 filters and candidates.
3. Follow up: What are their tradeoffs? Ensure earlier conversation is included.
4. Ask about current auction news. With web credentials, inspect W citations; without credentials, verify the missing-web notice.
5. Shortlist a candidate; open Shortlisted Targets and inspect fit. No claims of auction eligibility are implied.

Local inference was unavailable during implementation. Live cloud inference and the published URL still require credentials, API hosting and deployment verification.
