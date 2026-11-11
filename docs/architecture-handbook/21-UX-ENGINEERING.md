# 21 — UX Engineering

> **No user research, usability testing, analytics funnels or task-completion data exist in the repository.** Everything below is an expert heuristic review (Nielsen’s heuristics + task walk-throughs performed by the auditor on 2026-10-12). Treat findings as hypotheses to test with real users.

---

## 1. Information architecture

### 1.1 Top-level navigation (left rail, `components/layout.tsx:25-38`)

Home · My Dugout · Beyond XI · Scout Lab · 2027 Intel · Stats · Pulse · Scores · Intel Hub · Visuals · Auction · Insights · AI Analyst · Shop

| Issue | Why it matters |
|---|---|
| **14 peer destinations**, icon-only on desktop | exceeds what users can scan; icons like `Cpu`, `Activity`, `Radio`, `Zap` don’t communicate meaning |
| Overlapping concepts: *Stats* vs *Intel Hub* vs *Insights* vs *2027 Intel* vs *AI Analyst* vs *Visuals* | users can’t predict where an answer lives |
| Two “auction” experiences: *Auction* (a game) and *AI Analyst → Auction War Room* (valuation tool) | same word, different jobs |
| Sub-brands (*Beyond XI*, *Gully AI*, *CricField Scout Lab*) | no single mental model of the product |
| Many legacy redirects (`/on-field/*`, `/product`, `/growth`, `/merch`) | good for links; signals IA churn |

### 1.2 Implied audiences → suggested IA (proposal)

| Audience | Primary jobs | Proposed home |
|---|---|---|
| Fan | follow a team, check a player, browse matches | **Teams · Players · Matches** |
| Analyst / fantasy player | filter stats, ask questions | **Stats** (Advanced Stats + Ask) |
| Scout / franchise analyst | shortlist, compare, value | **Scout** (Scout Lab + War Room + Player Pool) |
| Curious visitor | stories, visual explainers | **Stories** (Insights, Visuals, 2027 Intel) |

Four to six top-level items, with games/shop moved to a secondary menu.

---

## 2. Key user flows (walked through in the running app)

| Flow | Steps | Friction found |
|---|---|---|
| **Find a player’s numbers** | Home → (no global search box in the top bar) → Stats or a player link → `/players/:slug` | No site-wide player search; slug conventions (`rg-sharma`, not `rohit-sharma`) cause “Player not found” |
| **Filter Advanced Stats** | `/stats` → scroll past full-screen hero → set filters → wait 2–3 s per change | Hero hides the task; long waits without progress context; many filter labels in 7–10 px uppercase |
| **Ask a question** | AI Analyst → Ask → type or click a suggestion | ✅ Best flow on the site: suggestions, instant answer (78 ms), visible interpretation chips, editable |
| **Scout a death bowler** | `/scout` → Bowling → Death | ❌ default order shows **most expensive** bowlers first; role column “Unclassified”; percentiles per league in a mixed table |
| **Value an auction target** | AI Analyst → Auction War Room → team filter | Rich explanation panels (“How prices and value are set”, “Reading the board”); thin-evidence estimates (basis 0.1) not visually flagged enough |
| **Follow my team** | Team switcher → My Dugout | ✅ re-themes the site; Dugout shows record/titles/captain; empty band in the middle of the page |

---

## 3. Onboarding

- **Consent banner** on first visit (declines non-essential by choice; site works if declined).
- **“Gully AI” quick tour**: 5 scripted cards (Dugout, Advanced Stats, Auction War Room, “12 AI Tactical Decision Engines”, Match Pulse) — `components/ai-mascot-guide.tsx`. Useful idea; the “AI” label and “12 AI engines” copy overstate what is AI (Chapter 9).
- No first-run personalisation beyond choosing a team; no explanation of what the indices (100 = league average) mean until you open Methodology.

---

## 4. Filtering and interaction patterns

| Pattern | Where | Assessment |
|---|---|---|
| Filter chips + dropdowns | Scout, Stats, War Room | good discoverability; Stats has ~15 filters → cognitive load |
| URL-synchronised state (`readParams/writeParams`) | Decision modules (weakness, auction, ask) | ✅ shareable, back-button friendly |
| React-state-only filters | Scout Lab home | ❔ filters appear not to be written to the URL → a shortlist view can’t be shared/bookmarked |
| Compare tray (≤ 5 players) | Scout | ✅ |
| Editable interpretation chips | Ask | ✅ excellent pattern for trustworthy NL interfaces |
| Seeded simulations | Strategy Sim, Alt Universe | ✅ reproducible results |

---

## 5. System status: loading, errors, empty states

| Page group | Loading | Error | Empty | Evidence |
|---|---|---|---|---|
| AI Analyst modules | ✅ spinners | ✅ `ErrorBanner` + labelled `DemoBanner` fallback | ✅ | 5–15 error markers per page |
| Scout Lab | ✅ | ✅ | 🟡 | 4–5 markers |
| Advanced Stats | ✅ | 🟡 1 marker | ✅ 15 empty messages | |
| Home, Dugout, Fan Arena, Feed | 🟡 | ❌ none | ❌ | sections silently empty when live data fails |
| Player page | ✅ | 🟡 | ✅ verified-identity empty state | |

The best pattern in the codebase is the Decision modules’ rule: *“Can’t reach the API … showing a saved scan of RG Sharma’s career. Start the api-server to scan any player.”* — it tells the user what happened, what they are seeing, and what to do.

---

## 6. Mobile usability (375 × 812, audit browser)

| Observation | Severity |
|---|---|
| Left icon rail (~56 px) + right rail take a large share of a 375 px screen; content column narrow (verify on a real phone — framer-motion measurement caveat in Chapter 7) | High |
| Cookie banner, mascot, tour card and rail toggle overlap the bottom of the viewport | High |
| Advanced Stats hero title clipped (“AD / STA”) | Medium |
| Scout table overflows horizontally inside its container | Medium (acceptable with a scroll hint; better as stacked cards) |
| Pinch-zoom disabled | High (accessibility) |
| No horizontal page scroll (document width = 375) | ✅ |

---

## 7. Heuristic scorecard (auditor judgement, 1–5)

| Heuristic | Score | Note |
|---|---:|---|
| Visibility of system status | 3 | strong in Decision modules, weak on Home/Dugout |
| Match with the real world (cricket language) | 4 | phases, economy, strike rate used correctly; indices need explanation |
| User control & freedom | 4 | editable chips, URL state in modules |
| Consistency & standards | 2 | naming, two auction features, inconsistent page shells |
| Error prevention | 3 | Zod on modern APIs; legacy filters accept anything |
| Recognition over recall | 2 | icon-only nav, jargon (IAR, shrunk index) |
| Flexibility & efficiency | 3 | power filters for analysts; no global search |
| Aesthetic & minimalist design | 2 | dense micro-labels, decorative heroes, overlays |
| Help users recover from errors | 3 | good banners in modules; “Player not found” dead end |
| Help & documentation | 4 | Methodology, Data Sources, in-module “how it works” panels |

---

## 8. Task completion

No task-completion rates, time-on-task or success metrics exist. GA4 is integrated (page views only, consent-gated), so a funnel could be measured once events are added (Chapter 24 §6).

---

## 9. Highest-impact UX fixes (proposals)

1. Global player/team search in the top bar.
2. Fix Scout bowling sort, show roles, explain “100 = league average” inline.
3. Reduce primary nav to ≤ 6 items; one product name.
4. Collapse decorative heroes; put the first table above the fold.
5. Mobile: hide right rail by default, one overlay at a time, card layout for tables, enable zoom.
6. Add error states to Home/Dugout for live-data failures.
7. Write Scout filters to the URL so shortlists are shareable.
