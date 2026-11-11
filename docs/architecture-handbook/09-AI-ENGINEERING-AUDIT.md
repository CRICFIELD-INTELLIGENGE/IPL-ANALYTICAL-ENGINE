# 09 — AI Engineering Audit

> **Question answered:** *How much real AI engineering is in CricField?*
> **Short answer:** very little runtime AI, a lot of deterministic statistics and simulation, and a great deal of AI-*assisted* development. The “AI Analyst” section is almost entirely deterministic. The only runtime LLM calls are optional, ungrounded Gemini requests — one of which falls back to **hardcoded text containing invented statistics**.

---

## 1. Classification of everything labelled “AI” or “intelligence”

| Feature (UI name) | What it actually is | Category | Evidence |
|---|---|---|---|
| **Ask the IPL Database** (“SQL Database” tab) | Phrase-matching parser → typed `StatQuery` → parameterised SQL → computed answer | **Deterministic NLP (rule-based) + SQL** | `services/decision/nl-parser.ts` header: “Deterministic and explainable … Nothing here touches SQL.” |
| **Gemini LLM** tab (Ask page) | Browser `fetch` to Google Gemini 1.5 Flash with the user’s own key; else hardcoded fallback | **LLM (optional) / mock** | `src/lib/gemini-client.ts` |
| Strategy Sim “Gemini briefing” | same client, `contextData = {context: "Live Strategy Simulation Dugout Briefing"}` — **no simulation numbers are passed** | LLM (optional) / mock | `pages/ai-analyst-strategy-sim.tsx:173` |
| Clip search / “Gully AI” clip finder | Server keyword matcher; Gemini JSON routing if `GEMINI_API_KEY` set | LLM (optional) + keyword search | `routes/clip-router.ts` |
| “Gully AI • Platform Guide” mascot | Scripted product tour and clip search UI | **Not AI** | `components/ai-mascot-guide.tsx` |
| `AIAnalystPanel` (“AI ANALYST · Online”) | Canned answers via `if (k.includes("death"))`, 350 ms fake delay | **Mock**, and **dead code** (not imported) | `components/ai-analyst-panel.tsx:15-45` |
| AI Insight Feed | Deterministic scans ranking statistical surprises (z-scores, Poisson-style odds) | Statistics | `insight-feed.ts` |
| Hidden Weakness Detector | Two-sample z-tests with Bonferroni correction | Statistics | `weakness-detector.ts` |
| Pressure Genome | Context-relative run values, shrinkage, percentiles | Statistics | `pressure-genome.ts` |
| Strategy Sim / Alt Universe / Decision Replay / Opposition Map | Outcome-table Monte Carlo + exact DP win probability | **Simulation** | `match-model.ts` |
| Win probability calibration | 2-parameter logistic (Platt) fitted by Newton’s method | **Fitted statistical model** (tiny ML) | `match-model.ts:414-476` |
| War Room market price | k-nearest-neighbour regression on past sales (k = 15, distance-weighted) | **Non-parametric ML (kNN)** | `auction-war-room.ts:187-223` |
| Player Pool / similar players | z-scored feature vectors, Euclidean / exp(−d²) similarity | Similarity search (unsupervised, no training) | `player-pool.ts`, `scout-service.ts:701-740` |
| Squad DNA | z-scores, correlations with win %, cosine similarity | Descriptive statistics | `squad-dna.ts` |
| Playing XI | Mixed-integer linear programming | **Optimisation (operations research)** | `playing-xi.ts` |
| Scout Lab ratings | league-relative indices, credibility shrinkage, Wilson CIs | Statistics | `scout-service.ts` |

**Honest summary for a CV:** “deterministic analytics, statistical testing, Monte Carlo simulation, MILP optimisation, kNN pricing and a Platt-calibrated win model; an optional LLM integration.” Do **not** describe the AI Analyst as an LLM agent, RAG system or ML platform.

---

## 2. Runtime LLM features in detail

### 2.1 Browser Gemini client (`src/lib/gemini-client.ts`)

| Aspect | Implementation |
|---|---|
| Model / provider | `gemini-1.5-flash`, Google Generative Language REST v1beta. (Model availability is **unverified** for 2026; Google has retired older Gemini versions before — check before demoing.) |
| Key | `VITE_GEMINI_API_KEY` (would be **baked into the public bundle**) or `localStorage["ipl_gemini_api_key"]` entered by the user; sent as a **URL query parameter** |
| Prompt construction | Single user turn: a fixed `SYSTEM_INSTRUCTION` (“world-class cricket tactical analyst…”) + `JSON.stringify(contextData)` + user text |
| Context / retrieval | **None.** No warehouse data is retrieved or passed. The Strategy Sim call passes only a label string. |
| Tools / function calling | None |
| Output validation | None — markdown text rendered as returned |
| Hallucination controls | None. The system prompt even asks for “calibrated numbers (e.g. over 18-20 economy …)” without supplying any. |
| Failure handling | Any error or missing key → `generateCalibratedFallback()` |
| Cost / latency | Paid per token on the user’s key; latency shown (`ms`) |
| Evaluation | None |

**The fallback is the critical issue.** `generateCalibratedFallback()` (`:118-…`) returns pre-written markdown chosen by keyword (`"death"`, `"kohli"`…) containing specific statistics — e.g. “A dot ball here increases win probability by +18.4%”, “league-wide death strike rate against orthodox spin exceeds 188.4” — that are **not computed from any data**, and labels the result `model: "gemini-1.5-flash (Calibrated Quant Engine)"`, `source: "calibrated_model"`. A visitor without a key sees invented numbers presented as model output. This should be removed or replaced with an explicit “No AI key configured” message, or — better — with the deterministic `/api/ask` answer.

### 2.2 Server clip router (`routes/clip-router.ts`)

| Aspect | Implementation |
|---|---|
| Prompt | Template with the **entire clip catalogue** inlined as JSON + user query (quotes escaped) |
| Generation config | `temperature: 0.1`, `responseMimeType: "application/json"` |
| Output validation | strips code fences, `JSON.parse`; returns `parsed.url` **without checking it exists in the catalogue** → a hallucinated URL would be passed to the user |
| Fallback | deterministic keyword/token matcher `matchClipLocally()` on any failure or missing key |
| Prompt-injection surface | user text is placed inside the prompt; the model could be told to output an arbitrary URL. Mitigation: accept only `clip_id`, look the URL up server-side. |

### 2.3 Natural-language Ask (deterministic) — the strongest “AI-like” feature

`POST /api/ask` → `parseQuestion()` consumes recognised phrases (“since 2022” → `seasonFrom: 2022`; “death overs” → `phase: "death"`; player names resolved to IDs, ambiguities reported in `notes`) → `StatQuery` (strict Zod) → `runStatQuery()` compiles parameterised SQL, returns additive components, computes ratios in TypeScript, and writes a one-sentence answer. The UI shows the interpretation as removable “READ AS” chips; editing a chip calls `POST /api/ask/run`.

*Why this is good design:* the language layer can never generate SQL; a future LLM translator would only need to emit a `StatQuery` that passes the same Zod schema (`stats-engine.ts` header). This is the right architecture for **grounded** LLM features — the LLM becomes a *parser*, the warehouse remains the source of truth.

Verified live: “Best economy in the death overs since 2022” → Narine 6.06 (218 runs, 36 overs), 78 ms, matching an independent recount in `global.db`.

---

## 3. AI-assisted development vs your own work

The repository shows heavy AI coding assistance:

- Replit Agent-style commit messages and `.agents/`, `.local/secondary_skills/` folders (Replit agent skills), `replit.md`.
- `.claude/`, `.kilo/`, `.qodo/`, `.sixth/` tool folders in the outer directory.
- Project-memory notes describing AI sessions building “Decision OS slices” and the global engine.
- Code style: long explanatory header comments, consistent documentation voice across modules.

This handbook makes **no claim** about which lines you wrote. Chapter 26 separates *documented decisions* (scope choices, approvals, review gates visible in `docs/global-data-engine/*` such as “Step 3 presented before applying”, “never describe economy as completely resolved”) from *implementation*, and lists what you must be able to reproduce yourself.

---

## 4. What would make CricField’s AI claims defensible

| Goal | Minimal implementation |
|---|---|
| Grounded LLM Q&A | Server-side endpoint: LLM converts question → `StatQuery` JSON (function calling), validated by the existing Zod schema, executed by `runStatQuery`; LLM may only paraphrase returned numbers |
| No key in browser | Server proxy with rate limiting and a spending cap |
| Hallucination control | Answer must cite only numbers present in the query result; automated check that every number in the text appears in the result |
| Evaluation | A fixed set of 50–100 questions with expected `StatQuery` and expected answers; report exact-match and execution accuracy |
| Model output validation | Zod schema on LLM JSON; reject unknown clip ids / metrics |

---

## 5. Interview questions on this chapter

1. *What exactly does the AI Analyst do?* — Deterministic statistics and simulations over the IPL warehouse; the “Ask” box is a rule-based parser into a typed query; there is an optional Gemini tab that is not grounded in the data.
2. *Is the Pressure Genome machine learning?* — No: context-relative averages, shrinkage and percentiles.
3. *What is the only trained component?* — The 2-parameter Platt calibration; the kNN price model “trains” only in the sense of storing past sales.
4. *How would you stop an LLM inventing numbers?* — Function-calling into a validated query schema; numbers only from results; output checks; evaluation set.
5. *Why is the Gemini fallback a problem?* — It presents fabricated statistics as model output; it undermines trust in the genuine analytics.
