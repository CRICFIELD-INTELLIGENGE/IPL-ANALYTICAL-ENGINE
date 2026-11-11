# Deduplication, Getty visibility and publication — report (2026-10-26)

Nothing was deleted, archived or published. Per-pair data is in `DEDUP-AUDIT.json`, per-article readiness in `PUBLICATION-READINESS.json`.

## 0. Before reading: the older articles are not more detailed

The brief assumed the 10 older articles per franchise are longer, hand-written and should be preferred. The audit says otherwise for all 100:

- **They are template-generated.**
  - Every one shares a single "key findings" template ("…generates a +X run rate delta…", "…playoff qualification probability by 19.2%").
  - Section bodies mostly restate the section heading.
- **Their statistics are not real.**
  - All 100 "phase tables" misstate the franchise's run rate by more than 0.5 an over against the warehouse.
  - Example (CSK): the article says powerplay 11.95 against a league 8.65; the actual figures are 7.89 against 8.09. It says death overs 13.65; the actual figure is 10.41.
  - Headline "Win Correlation" values rise in steps of exactly 2.5 across a franchise's ten articles.
- **80 of them are labelled "Verified".**
- **They are only modestly longer:** about 575 words, against 269–837 (median 342) for the new articles, whose figures are each tied to a warehouse query.

**Recommendation.** Keep each older article's **URL, slug, metadata and inbound links**, but do not keep its statistics. The existing "revise" mechanism does this: the new article is served at the older URL, and the older text stays in the repository. An older article should not be published as-is while it carries false "Verified" figures.

## 1. CSK duplicate and overlap report (each pair read in full)

| Older article | Closest new article | Verdict | Why |
|---|---|---|---|
| art-csk-01 The Yellow Blueprint | cf-csk-040 Three-Year Squad Planning | partial overlap | Both argue continuity is CSK's edge; the older piece adds role clarity and culture |
| art-csk-02 The Art of Controlled Aggression | cf-csk-004 Middle-Overs Momentum | **duplicate** | Same question: how CSK bat through overs 7–15 |
| art-csk-03 Spin, Pace and Patience | cf-csk-019 Bowler Matchups | partial overlap | Older piece surveys bowlers by name; new piece tests rotation with data (also overlaps 011, 014, 015) |
| art-csk-04 The Dhoni Effect | cf-csk-030 Captaincy Under Uncertainty | partial overlap | Dhoni personally vs franchise-level decisions |
| art-csk-05 The Chepauk Code | cf-csk-022 Home-Ground Advantage | **duplicate** | Same subject |
| art-csk-06 Experience as an Asset | cf-csk-074 Age Curves | partial overlap | Veterans' value at auction vs performance by age (value side overlaps 039) |
| art-csk-07 The Matchup Machine | cf-csk-027 Opponent-Specific Plans | partial overlap | Change the XI by conditions vs by opponent |
| art-csk-08 The Generational Transition | cf-csk-067 Squad Philosophy Evolution | partial overlap | Narrative of eras vs measured squad usage (leadership overlaps 064) |
| art-csk-09 The Dot-Ball Economy | cf-csk-014 Middle-Overs Spin | **duplicate** | Same thesis: pressure without wickets |
| art-csk-10 Life Beyond Familiar Names | cf-csk-091 The 2027 Blueprint | **duplicate** | Same question: what to build next |

**CSK totals:** 4 duplicates, 6 partial overlaps, 0 distinct.

**Other franchises** (topic-level review of title, subtitle and headings; read both articles before acting):

| | SRH | RCB* | MI | KKR | RR | DC | PBKS | GT | LSG | All 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Duplicate | 4 | 9 | 3 | 4 | 5 | 5 | 5 | 4 | 6 | **49** |
| Partial overlap | 6 | 0 | 7 | 5 | 5 | 5 | 5 | 6 | 4 | **49** |
| Distinct | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | **2** |

\*RCB uses its existing reviewed decisions: 9 revisions and 1 kept separate.

The automatic title and heading matcher agreed with the reviewed pairings only 26 times in 100, so it was not used to decide anything.

## 2. Which versions to keep

- **Duplicates (49):** serve the new evidence article at the older article's URL (decision "revise", already supported). The older text stays in the repository, unpublished. One reviewed decision per pair.
- **Partial overlaps (49):** keep both. Each older article needs its synthetic tables, key stats, key findings and "Verified" label removed or replaced before it is fit to publish. The new article's evidence can be quoted into it.
- **Distinct (2):** keep both. These are KKR-04 ("The Russell Factor") and RCB-08.
- **Archiving:** none done. Apply each decision only after you have reviewed the pair: add a `reviewed: true` entry to `legacy-decisions.json`, then re-run the engine for that slot.

## 3. Unique articles remaining

| | Now | After merging the duplicates |
|---|---|---|
| CSK | 110 | **106** (100 new + 6 older partial overlaps) |
| All franchises | 1,100 (1,000 new + 100 older) | **1,051** |

RCB is already at 101, because its 9 revisions are applied.

## 4. Getty localhost rendering tests (dev server, port 3000)

| Test | Result |
|---|---|
| Consent declined | ✅ Stored `denied`; no Getty script, no frame; CricField illustration shown |
| Refresh while declined | ✅ Still denied; banner not shown again; nothing loaded |
| Consent accepted (banner) | ✅ Stored `granted`; one `widgets.js`; hero viewer rendered (asset 2212277904) without a reload |
| Refresh while accepted | ✅ No banner; viewer loads straight away; one script |
| Navigation between articles | ✅ Two new articles and one older article in sequence: one script throughout, correct asset per page, no blank frames |
| Embed unavailable (Getty loader stubbed) | ✅ No viewer; after the 12-second timeout the slot fell back to the illustration |
| Unknown article URL | ✅ Now a 404. It previously rendered SRH's first article; fixed |

**Fix made:** on localhost the banner never offered the embed choice, because it only asked when a *publishable* photo existed, and there are none. It now also asks in development builds when local preview photos exist. Production behaviour is unchanged. Pending records stay pending, and the public gate is untouched.

## 5. Articles ready for publication

Publication now depends only on four article criteria: content, editorial review, metadata and route. Image rights are not one of them.

- **1,000** articles pass content, metadata and route checks; **0** have an editorial sign-off, so **0** are ready to publish and **0** are published.
- All 1,000 had been switched to `published` at 10:07 today, with no review, by something outside this session. They were set back to `review` at the owner's request, changing one line per file.
- Verified in a production build:
  - an approved article ships while its pending photo does not, and the page shows the illustration;
  - articles without an approved review are withheld.

## 6. Getty photographs not cleared for publication

- **990** are `pending-license` and await rights review (the engine heroes).
- **340** are `approved-embed` by the Editorial Desk but lack the written Getty authorization the gate requires.
- **0 of 1,330** are publishable; the production build ships none.

## 7. Files changed and tests run

**Changed**
- `src/lib/editorial-images.ts`: `isLocalPreviewable()` added; development preview made independent of approval.
- `src/components/dugout/editorial-image-figure.tsx`: honours `allowUnpublished` in development only.
- `src/components/consent-banner.tsx`: asks for embed consent on localhost when preview photos exist.
- `src/pages/article-detail.tsx`: unknown slug returns 404.
- `src/data/editorial/schema.ts`: optional `editorialReview`.
- `scripts/editorial/validate-articles.ts`: "published" needs an approved review; writes `VALIDATION-REPORT.json`.
- `vite.config.ts`: article release requires `published` plus an approved review.
- New scripts:
  - `scripts/editorial/publication-readiness.ts`
  - `scripts/editorial/publish-article.ts` (manual; `--dry-run` supported)
  - `scripts/editorial/dedup-audit.ts`
- `src/data/editorial/articles/**`: status `published` → `review` (one line each).
- `src/data/editorial-images/manifest.json`: `captionVerified` corrected to false on the 990 heroes.
- Also this session:
  - Dugout 10-article preview and the shared library (`franchise-library.tsx`, `dugout.tsx`, `intelligence.tsx`);
  - right-panel AI Analyst Navigator (`analyst-navigator.tsx`, `layout.tsx`);
  - captain fixes (`franchise-hero.tsx`).

**Tests**
- `validate-articles` reports 1,000 articles with 0 errors.
- `publication-readiness` reports the figures above.
- `check-editorial-images`: 3,686 passed and 340 failed; all 340 failures are approved records with no authorization, as the gate requires.
- Type-check is clean on the changed files.
- Production builds:
  - 0 Getty records;
  - review articles withheld;
  - a positive-path test where one approved article ships, with the file restored afterwards;
  - a page check showing the illustration.
- The browser tests in section 4.
