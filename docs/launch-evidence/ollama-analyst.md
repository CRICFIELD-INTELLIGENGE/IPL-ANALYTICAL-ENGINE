# Local Ollama AI Analyst

CricField now defaults to local Ollama. The existing desktop service was detected at http://127.0.0.1:11434 with llama3:latest, gemma:latest, gemma:2b and tinyllama:latest. Configured llama3:latest; no models downloaded.

## Configuration

Edit the ignored server file env/api.env:

    AI_PROVIDER=ollama
    OLLAMA_BASE_URL=http://127.0.0.1:11434
    OLLAMA_MODEL=llama3:latest
    AI_ANALYST_ENABLED=true

API startup automatically loads this file, with host environment variables taking precedence. Restart the API after edits. API tokens are unnecessary for Ollama. Cloudflare and OpenRouter adapters remain optional and are not selected or used as fallback.

The installed model is used for explanation after server-side evidence retrieval, because the installed model generation does not support the native tool API. Statistics questions use the existing parser and read-only warehouse; auction/purse/retention questions use the auction desk. Unsupported requests ask for clarification. One evidence retrieval and one local inference request are used, with a 90-second timeout. The browser waits up to 100 seconds. No invented SQL, account queries or remote model access.

Ollama endpoint is restricted to local HTTP loopback addresses. AI output remains an interpretation; inspect the displayed evidence. Local feature availability depends on Ollama running and sufficient desktop memory. A hosted CricField API cannot reach your desktop via localhost; it would need its own model service.

Reference: https://docs.ollama.com/api/chat and https://docs.ollama.com/capabilities/tool-calling

Validation: API typecheck passed; 15 mocked AI/provider tests passed. Real local inference smoke test uses a labeled fixture rather than asserting any real cricket result.

Live result: llama3:latest successfully answered the labeled connectivity fixture and cited [S1]. Environment-loader check confirmed provider=ollama, model=llama3:latest, enabled=true. API/frontend TypeScript checks passed. Full warehouse-to-browser answer quality remains untested.
