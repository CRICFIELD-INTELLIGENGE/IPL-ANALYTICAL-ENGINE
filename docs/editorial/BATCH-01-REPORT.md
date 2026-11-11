# Dugout 1,000-article programme: Batch 0 and Batch 1 report

Date: 2026-10-25. Scope: Batch 0 (audit and foundation) and Batch 1 (10 RCB articles, one per aspect).
Nothing is committed, deployed or published. All 10 articles are `status: review` and render only on localhost.

## Batch 0: foundation

| Item | Result | Where |
|---|---|---|
| Plan import | 1,000 titles imported. 10 franchises × 10 aspects × 10 titles. IDs, slugs and titles are unique. All 1,000 titles match the Markdown copy. | `scripts/editorial/import-plan.ts` → `src/data/editorial/plan/titles-1000.json` (source copied to `docs/editorial/plan/`) |
| Duplicate detection | 100 legacy articles scored against their franchise's 100 plan titles: 0 exact, 33 semantic, 49 partial, 18 no match. RCB's 10 decisions are reviewed: 9 revise, 1 kept separate. The other 90 are pending their own batches. | `scripts/editorial/coverage-report.ts` → `docs/editorial/COVERAGE-REPORT.md`, `plan/legacy-decisions.json` |
| Article schema v2 | Zod schema: plan entry, evidence file, article, index entry. Fixed five-role section order. Statuses are draft / review / published. | `src/data/editorial/schema.ts` |
| Evidence pipeline | Read-only `node:sqlite` generators. Every metric records its dataset, filters, sample size, SQL and a validation step. A run fails if any validation fails. | `scripts/editorial/evidence/` |
| Validator | Checks schema and plan alignment (title, aspect, slug or legacy URL); token resolution; numerals in prose; chart keys; citations; hypotheses; videos. Generates the index, the report and the sitemap. | `scripts/editorial/validate-articles.ts` → `docs/editorial/VALIDATION-REPORT.md` |
| Release gate | The public build ships only `published` articles. Review articles and their evidence become `null`, so their text never reaches the bundle. Verified on a real build: 0 of 10 shipped, and no article text was found in the output. | `vite.config.ts` (`cricfield-editorial-article-release`) |
| Getty and video audit | The image gate passes 1,055 checks, after being extended to accept v2 article IDs. In the video registry, 866 of 1,001 entries are exact URLs. The generated (`gemini_catalogue`) entries are rejected by the validator. | `scripts/check-editorial-images.ts`, validator |

## Batch 1: the 10 RCB articles

| # | Plan ID | Aspect | Title (abridged) | URL | Words | Metrics | Charts | Photos | Video |
|---|---|---|---|---|---|---|---|---|---|
| 1 | cf-rcb-001 | Batting | The Powerplay Equation | new slug | 656 | 35 | 4 | 3 | 1 |
| 2 | cf-rcb-015 | Bowling & Fielding | Death-Overs Risk | new slug | 649 | 24 | 3 | 3 | 1 |
| 3 | cf-rcb-022 | Tactical | Home-Ground Advantage (Chinnaswamy) | **legacy URL kept** (revises art-rcb-05) | 610 | 24 | 2 | 3 | 1 |
| 4 | cf-rcb-039 | Auction | Salary Versus Contribution | new slug | 570 | 20 | 3 | 3 | 0 |
| 5 | cf-rcb-041 | Business | The Business of Belonging | new slug | 587 | 17 | 1 | 3 | 0 |
| 6 | cf-rcb-051 | Fan culture | Why Fans Stay | new slug | 527 | 8 | 1 | 3 | 0 |
| 7 | cf-rcb-062 | History | The Season That Changed the Conversation | new slug | 510 | 22 | 2 | 3 | 2 |
| 8 | cf-rcb-080 | Scouting | The Scout's Blind Spot | new slug | 538 | 15 | 2 | 3 | 0 |
| 9 | cf-rcb-085 | Data science | Clutch or Coincidence? | **legacy URL kept** (revises art-rcb-04) | 530 | 13 | 1 | 3 | 1 |
| 10 | cf-rcb-100 | Future | The Future XI | new slug | 541 | 17 | 2 | 3 | 1 |

### Metrics for the batch

1. **Articles completed:** 10 of 10 planned for Batch 1. All are `review`; none are published.
2. **Duplicates handled:** 2 legacy articles revised in place with their URLs preserved (art-rcb-05 → 022, art-rcb-04 → 085). The other 7 RCB revisions are mapped to future plan slots.
3. **Statistics:** 223 evidence metrics and 22 tables were generated, and every metric passed its validation step. The articles cite 195 distinct metrics. The article prose contains 0 hand-typed numerals; every number is a `{{ev:…}}` token.
4. **Charts:** 21 charts, all drawn from evidence tables. Each has a title, unit, source, filters, sample size, an accessible label and a data-table view. The palette was validated with the dataviz checker.
5. **External sources:** 4. Houlihan Lokey 2025 and 2026 press releases (primary PDFs, figures re-read against the text); Cialdini et al. 1976; Wann & Branscombe 1990. DOIs are not cited because they could not be verified.
6. **Hypotheses labelled:** 12. Each one says why it is unproven and how to test it.
7. **Getty photography:** 30 new frames, a hero plus two inline photos per article. Each was chosen from the article's own narrative. Each was confirmed embeddable on Getty's detail page (`embeddable` and `asset_embed_capable`), and the transcription was checksum-verified. **All 30 were confirmed rendering as Getty iframes in the browser.** They are licensed: **0**. All are `pending-license` and stripped from public builds.
8. **Videos:** 7 "Watch the Moment" cards, all verified exact JioHotstar URLs from the sitemap-discovered registry. Each card's match facts were cross-checked against the warehouse.
9. **Validation:** 0 errors. There are 10 warnings: every article is under the 700-word guideline, at 510–656 words of prose plus charts and tables.
10. **Testing:** typecheck 0 errors. The image gate passes 1,055 checks. All 10 articles were browser-tested on localhost:3000: photos, charts, video cards, hypotheses, no raw tokens and no console errors. Mobile width was tested at 375px with no overflow. A production build was served and checked: the legacy text is served at revised URLs and the library lists legacy articles only.

## Data defects found while building the evidence

- `squads-by-season.json` role and nationality labels are unreliable for RCB 2025–26. Bhuvneshwar Kumar and Devdutt Padikkal are tagged as all-rounders, and Mayank Agarwal as an *overseas wicketkeeper*. The Future XI article therefore derives roles from what players actually did.
- In `points-tables.json`, `qualified` marks Qualifier 1 only. Eliminator teams carry `result: "E"`. The validation step caught a bug this caused (four playoff seasons were missed), and it was fixed.
- In the video registry, at least one `gemini_catalogue` entry ("Kohli's 75* vs GT in Final") carries a content ID from the 2024 range. The validator now rejects that whole source.
- `matches.margin_type` is null throughout, so margins are computed from the innings. Fixtures abandoned without a ball are absent from the source (for example RCB's 2017 season shows 13 matches).

## Remaining work

- **Editorial review:** an editor must read each article and change its `status` to `published` before it can appear publicly.
- **Licensing:** the Getty frames need a licence before any public use. Getty's embed terms are non-commercial and the site runs AdSense. Without a licence, the public build uses the illustrated covers.
- **Later batches:**
  - RCB: the remaining 90 titles. Seven of them will revise legacy articles at their existing URLs.
  - Then the other nine franchises: 900 titles. Each batch needs its legacy-duplicate decisions reviewed.
- **Per-franchise accents:** each franchise's chart accent needs to be validated with the palette checker before its batch (RCB red has been validated).
