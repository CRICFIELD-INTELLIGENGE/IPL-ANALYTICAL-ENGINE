# Editorial Dugout photography

How Getty Images (or other rights-cleared) photographs get into Dugout articles without anything
unlicensed reaching a public page.

## Where things live

| Piece | File |
|---|---|
| Article text (unchanged) | `artifacts/ipl-analytics/src/data/editorial-magazine-data.ts` |
| Image metadata (separate from the text) | `artifacts/ipl-analytics/src/data/editorial-images/manifest.json` |
| Types | `artifacts/ipl-analytics/src/data/editorial-images/types.ts` |
| Rights gate + Getty embed parser | `artifacts/ipl-analytics/src/lib/editorial-images.ts` |
| Per-section image planner | `artifacts/ipl-analytics/src/lib/editorial-image-plan.ts` |
| Figure component (embed / licensed file) | `artifacts/ipl-analytics/src/components/dugout/editorial-image-figure.tsx` |
| Article page slots | `artifacts/ipl-analytics/src/pages/article-detail.tsx` (header + after each segment's first paragraph) |
| Review panel | `/admin/editorial-images` → `src/pages/editorial-image-review.tsx` (dev builds, or `VITE_ENABLE_ADMIN_PAGES=true`) |
| Checks + generated docs | `artifacts/ipl-analytics/scripts/check-editorial-images.ts` |
| Generated plan / status | `IMAGE-PLAN.md`, `RIGHTS-STATUS.md` in this folder |

## Workflow

1. **Plan.** Open `/admin/editorial-images` (or `IMAGE-PLAN.md`). Each article has six slots: header plus
   segments 1–5. Each slot shows the segment's role, the players, season and venue named in that segment's own
   text, what to check in the Getty caption, and a Getty editorial search link. Slots marked *optional* name no
   player. Leave them empty unless a genuinely fitting team or venue image turns up.
2. **Discover (by hand).** Run the search on gettyimages.com while signed in to your Getty account. Open the asset
   page and read the caption: team kit, players, date and venue must match the segment. Never substitute another
   player, franchise or season.
3. **Embed or licence.**
   - *Getty Embed:* if the asset page offers the `</>` Embed button, copy the embed code exactly as given. Paste it
     with the asset page URL, caption and credit into the slot's form.
   - *Licensed file:* if the image can't be embedded, or the use is commercial, licence it from Getty. Host the
     file under `public/editorial/…` and record the licensor, licence reference and any expiry date.
   - Otherwise, use a CricField original (illustration or chart) or leave the slot empty. The header falls back to
     the existing cover canvas automatically.
4. **Review.** Enter your name and tick all four checklist items. *Approve* stays disabled until the record passes
   every rule in `publishBlockers()`. *Reject* keeps the candidate in the audit trail.
5. **Publish.** Click *Export manifest.json*, replace `src/data/editorial-images/manifest.json` with it, then run
   `pnpm exec tsx scripts/check-editorial-images.ts --write-docs` from `artifacts/ipl-analytics` and commit.
   Approvals stay a local browser draft until that commit lands.

## Localhost photography (dev server)

On `pnpm dev`, any `pending-license` Getty record that carries Getty's official embed code renders in the article
through Getty's Embedded Viewer. Each article gets a header photo plus 2–3 photos between segments, with Getty's own
caption, photographer credit and logo inside the viewer, and the caption repeated below the photo. Articles have no
draft or licence labels. Candidates without an embed code render nothing, and the header falls back to the CricField
cover illustration. Records keep `pending-license`, so nothing here claims a licence.

`pnpm build` strips every candidate, so a public build shows only `licensed` / `approved-embed` images (currently
none) and CricField's own illustrations. An internal build (`VITE_ENABLE_ADMIN_PAGES=true`) keeps them, with a
warning; never deploy that build publicly.

Getty's Embed dialog states: "By using the code above and embedding this image, you consent to the Getty Images
Terms of Use. Note: Embedded images may not be used for commercial purposes." CricField will carry AdSense, so
license each image (`scripts/editorial-images.ts activate …`) before launch, or get Getty's written OK for embeds.

How embed codes were collected (2026-10-25): Getty editorial search → read each asset page (full caption, date,
credit, `embeddable` flag) → press the asset page's Embed button → copy the code. The 37 cover-article records came
from this process; each record's `discovery.query` is the search used.

In Git Bash, prefix CLI calls that pass `/editorial/...` paths with `MSYS_NO_PATHCONV=1`, otherwise Git Bash
rewrites the path.

## What the gate enforces

- Only `approved-embed` and `licensed` records render. `pending-review` and `rejected` never do.
- Every approved record needs a reviewer, a timestamp, all four checklist items, a caption, alt text and a credit.
- `approved-embed`: the embed code must be Getty's exact single-image format, loaded via
  `embed-cdn.gettyimages.com/widgets.js`. Its asset id must match the record's `assetId` and the asset page URL.
  Arbitrary HTML is rejected, and the record may not also carry a direct image URL.
- `licensed`: the file must be self-hosted or on a non-Getty HTTPS host. Getty and iStock preview/CDN URLs are
  refused, the licence reference is required, and an expired licence stops rendering.
- The figure component re-checks the gate itself. Broken files and embeds that never load remove themselves.

## Rights notes (owner decision required)

Getty's 2014 embed terms limited the Embedded Viewer to editorial, non-commercial use. Coverage at the time quoted
Getty as saying that ads on a site don't by themselves make an embed commercial, but that using imagery to
promote a product, service or business does. CricField runs AdSense. Check Getty's **current** terms, or ask
Getty, before approving any embed. If in doubt, licence the image.

## Implementation notes

- The Getty widget loads only when its figure nears the viewport. Its caption and credit sit in a `<figcaption>`
  below the embed and are never overlaid on it.
- Ads stay where they were (leaderboards on `/dugout`, the right-rail partner slot on articles). The article body
  has no in-article ad slot, and no ad was moved next to a photo.
- Hosting your own copy of a Getty comp, or reusing its thumbnail URL, is not licensing. The gate rejects both.

## Embed-only mode (portfolio, no paid licences)

CricField uses Getty's free official Embedded Viewer only: no downloads, no image URLs, no custom image element in place of the viewer.

- **Consent:** `src/lib/embed-consent.ts`. Nothing from Getty loads until the visitor accepts embedded content (banner or "Show photos"); otherwise the CricField illustration shows.
- **Placement policy:** `src/components/photo-policy.tsx`.
  - `CommercialZone` (Shop, ad units, sponsor modules, future Premium) refuses Getty-sourced photos.
  - While a viewer is on screen, `AdVessel`, `AdSlot` and `SponsorModule` withdraw from that page.
- **Audit:** `pnpm exec tsx scripts/editorial/placement-audit.ts` → `PLACEMENT-AUDIT.md`. It fails if a safeguard is missing.
- **Verification and open questions for Getty:** see `GETTY-EMBED-REPORT.md`.
- **Approvals:** being embeddable is not approval. Records stay `pending-license` until an editor completes the four-point checklist; public builds ship only approved records.
