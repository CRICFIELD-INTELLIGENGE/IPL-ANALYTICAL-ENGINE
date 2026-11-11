# Photo placement audit

Generated 2026-10-26 by `scripts/editorial/placement-audit.ts` (static analysis of each route's import tree).

## Safeguards

| Check | Result | Detail |
|---|---|---|
| Getty viewer registers itself while mounted (drives ad-free pages) | pass | editorial-image-figure.tsx |
| Photo components refuse Getty photos in commercial zones and without embed consent | pass | usePhotoAllowed in EditorialImageFigure and EditorialCardMedia |
| AdVessel is a commercial zone and withdraws on Getty pages | **FAIL** | ad-vessel.tsx |
| AdSlot is a commercial zone and withdraws on Getty pages | **FAIL** | ad-slot.tsx |
| Shop route is a commercial zone with no editorial photo components | pass | zone=shop, getty=false |
| Sponsor modules on /dugout/articles/:slug are withheld while Getty embeds show | pass | src/pages/article-detail.tsx |
| Sponsor modules on /articles/:slug are withheld while Getty embeds show | pass | src/pages/article-detail.tsx |
| Sponsor modules on /dugout are withheld while Getty embeds show | pass | src/pages/dugout.tsx |
| Sponsor modules on /dugout/:team are withheld while Getty embeds show | pass | src/pages/dugout.tsx |
| No Getty image-file URLs (hotlinks) in the app source | pass | none |
| Getty's widget script is loaded only by the consent-gated viewer | pass | only editorial-image-figure.tsx |
| Consent banner asks about embedded Getty content | pass | consent-banner.tsx |
| Privacy policy discloses Getty's Embedded Viewer and offers controls | pass | privacy.tsx |
| No approved record lacks a review (no automatic approvals) | pass | {"approved-embed":340,"pending-license":990} |

## Routes

“Getty” = an editorial photo component is reachable from the page. “Ad units” = AdVessel/AdSlot occurrences in the page's components. At runtime, ad units and sponsor modules withdraw while a Getty viewer is on screen.

| Route | Getty photos | Ad units (slots) | Sponsor modules | Sponsors withheld on Getty pages | Shop / merch | Premium | Commercial zone | Admin only |
|---|---|---|---|---|---|---|---|---|
| `/home` | — | 1 (3847561029) | — | — | — | — | — | — |
| `/dugout/articles/:slug` | yes | 2 (1029384758) | 4 | yes | — | — | — | — |
| `/articles/:slug` | yes | 2 (1029384758) | 4 | yes | — | — | — | — |
| `/dugout` | yes | 2 (1029384770, 1029384760) | 1 | yes | — | — | — | — |
| `/dugout/:team` | yes | 2 (1029384770, 1029384760) | 1 | yes | — | — | — | — |
| `/admin/photo-pipeline` | — | — | — | — | — | — | — | yes |
| `/photo-pipeline` | — | — | — | — | — | — | — | yes |
| `/admin/editorial-images` | yes | — | — | — | — | — | — | yes |
| `/arena` | — | — | — | — | — | — | — | — |
| `/beyond-xi` | — | — | — | — | — | — | — | — |
| `/fan-arena` | — | — | — | — | — | — | — | — |
| `/intelligence` | — | — | — | — | — | — | — | — |
| `/feed` | — | 1 (1029384759) | — | — | — | — | — | — |
| `/stats` | — | 1 (1029384758) | — | — | — | — | — | — |
| `/pulse` | — | — | — | — | — | — | — | — |
| `/scout` | — | — | — | — | — | — | — | — |
| `/scout/player/:id` | — | — | — | — | — | — | — | — |
| `/scout/compare` | — | — | — | — | — | — | — | — |
| `/scout/roles` | — | — | — | — | — | — | — | — |
| `/arcade` | — | — | — | — | — | — | — | — |
| `/arcade/hand-cricket` | — | — | — | — | — | — | — | — |
| `/arcade/higher-or-lower` | — | — | — | — | — | — | — | — |
| `/arcade/guess-cricketer` | — | — | — | — | — | — | — | — |
| `/arcade/super-over` | — | — | — | — | — | — | — | — |
| `/arcade/build-your-xi` | — | — | — | — | — | — | — | — |
| `/arcade/auction-room` | — | — | — | — | — | — | — | — |
| `/match/:id` | — | — | — | — | — | — | — | — |
| `/strategy` | — | 1 (1029384759) | — | — | — | — | — | — |
| `/reports` | — | 1 (1029384756) | — | — | — | — | — | — |
| `/blogs` | — | 1 (1029384756) | — | — | — | — | — | — |
| `/scores` | — | 1 (1029384757) | — | — | — | — | — | — |
| `/ai-analyst/ask` | — | 1 (2938475610) | — | — | — | — | — | — |
| `/ai-analyst/weakness` | — | — | — | — | — | — | — | — |
| `/ai-analyst/pressure` | — | — | — | — | — | — | — | — |
| `/ai-analyst/feed` | — | — | — | — | — | — | — | — |
| `/ai-analyst/strategy-sim` | — | 1 (1029384756) | — | — | — | — | — | — |
| `/ai-analyst/alt-universe` | — | 1 (2948571630) | — | — | — | — | — | — |
| `/ai-analyst/opposition-map` | — | 1 (1029485739) | — | — | — | — | — | — |
| `/ai-analyst/decision-replay` | — | 1 (1029384850) | — | — | — | — | — | — |
| `/ai-analyst/squad-dna` | — | — | — | — | — | — | — | — |
| `/ai-analyst/auction-war-room` | — | — | — | — | — | — | — | — |
| `/ai-analyst/player-pool` | — | — | — | — | — | — | — | — |
| `/ai-analyst` | — | 1 (1029384756) | — | — | — | — | — | — |
| `/players/:slug` | — | — | — | — | — | — | — | — |
| `/venues/:slug` | — | — | — | — | — | — | — | — |
| `/teams/:slug` | — | — | — | — | — | — | — | — |
| `/visualizations` | — | 1 (7293840192) | — | — | — | — | — | — |
| `/shop` | — | — | — | — | yes | — | shop | — |
| `/about` | — | — | — | — | — | — | — | — |
| `/methodology` | — | — | — | — | — | — | — | — |
| `/data-sources` | — | — | — | — | — | — | — | — |
| `/contact` | — | — | — | — | — | — | — | — |
| `/disclaimer` | — | — | — | — | — | — | — | — |
| `/privacy` | — | — | — | — | — | — | — | — |

## Getty image registry

1330 records: 340 approved-embed, 990 pending-license. Articles covered: 1100.

Public builds ship only `approved-embed` / `licensed` records that pass the four-point checklist; every other record is stripped at build time. On localhost, candidates render for review once the visitor has consented to embedded content.
