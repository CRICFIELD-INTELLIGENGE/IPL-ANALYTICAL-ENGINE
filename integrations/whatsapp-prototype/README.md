# CricField WhatsApp test prototype

Separate Node project using pinned @wappy_ai/whatsapp 0.1.2. No changes to CricField's main dependency graph. The SDK source was reviewed for signature checks, handshake, parsing, deduplication and session-window sending before installation; install scripts were disabled.

From this folder:

    npm run check
    npm run dev
    npm test

The dev launcher starts CricField's API on 5055 if absent and starts the webhook on 5090 when Meta settings exist. Ollama must be running. The API loads env/api.env; the prototype loads env/whatsapp.env. Both are Git-ignored.

## Meta setup required for real testing

Fill env/whatsapp.env with your Meta test phone-number ID, app secret, verify token, access token, supported Graph API version, and comma-separated approved recipient numbers (digits only, country code included). Keep WHATSAPP_SEND_ENABLED=false initially. Expose only local port 5090 through your chosen HTTPS tunnel and register its /webhook URL plus verify token in Meta. Subscribe the test app to messages. A Meta account, test phone and approved recipient configuration cannot be provisioned from this repository alone.

The webhook validates the raw-body signature, filters the business-number ID and sender allowlist, accepts recent text questions up to 300 characters, deduplicates message IDs, and queues bounded serial work. It calls the existing /api/ai/analyst over loopback and includes evidence references in the answer. Dry-run logs only hashed message IDs and outcome/timestamp; message bodies, phone numbers and secrets are not logged. Live test replies require an explicit environment flag and complete settings. No live messages were sent during implementation.

## Prototype limits

Queue and dedup are in-memory and reset on restart. Acknowledged messages can be lost on process failure. Failed processing is logged but not automatically replayed. No persistent job queue, proactive alerts, templates, account linking, recipient identity proof or notification subscriptions yet. This is an isolated Meta test-number prototype, not a production messaging service. One send attempt avoids ambiguous retry duplicates. Local delivery logs remain private under data/ and need retention/rotation before production. No public tunnel was automatically opened.

SDK: https://github.com/csr1010/whatsapp-ai-agent-sdk
