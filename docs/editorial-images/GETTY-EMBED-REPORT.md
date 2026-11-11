# Getty embed-only mode: verification and eligibility report

Date: 2026-10-25. Scope: CricField as a personal portfolio project. Getty photography uses only Getty's free official Embedded Viewer. There is no licence purchase, no download, no scraping and no hotlinking.

## 1. What was verified

| Check | Result | Method |
|---|---|---|
| Candidates preserved | **340 of 340** records unchanged, covering 110 articles (100 legacy and 10 v2). Every record has `source: getty`, an official embed code, caption, credit and Getty asset page. | `src/data/editorial-images/manifest.json`; image gate 1,055/1,055 passing |
| Getty's own Embed flag | At the time of writing, **224 of 340** were confirmed embeddable by Getty (`embeddable` and `asset_embed_capable` both true) and **0** were found non-embeddable. The other **116** were blocked by Getty rate-limiting (HTTP 429) and are still being re-checked slowly; Getty's embed service did issue a snippet for a sampled throttled asset. Final per-asset results will go in `embed-verification.json`. | Each asset's Getty detail page was read for `embeddable` and `asset_embed_capable` in the built-in browser. Throttled requests were retried slowly; Getty's rate limit was respected, not bypassed. |
| Official embed codes | 340 of 340 are Getty's own snippet format, and each was issued by Getty's embed service. Getty issues a fresh element ID and signature on every request, so stored codes are compared by function rather than byte-for-byte. | `embed.gettyimages.com/preview/<id>` (`jsSnippet`), the service behind the Embed button |
| Functioning embeds | **340 of 340** stored codes produced a Getty viewer iframe for the correct asset (0 failures, 0 unparseable). | Each stored code was run through Getty's `widgets.js` on localhost, and the viewer iframe and its asset ID were checked |
| Rendering in articles | **30 of 30** Batch 1 photos and all Dugout card covers on the RCB page were confirmed rendering after consent, with Getty's attribution bar visible. | Browser test on localhost:3000 |

Per-asset results are in `docs/editorial-images/embed-verification.json`.

## 2. Safeguards now in place

- **Consent first.** No Getty script or iframe is requested until the visitor accepts embedded content, either in the cookie banner or with "Show photos" on an article. Until then, readers see the original CricField illustration. This was verified in the browser: before consent there was no `widgets.js` and no iframe; after consent, 3 of 3 photos appeared.
- **Ad-free Getty pages.** While a Getty viewer is on screen, AdSense units and sponsor modules on that page withdraw. Pages without embeds keep their ads.
  - Verified: an article with consent showed 0 ad units and no sponsor box.
  - Verified: `/dugout/rcb` showed 20 card embeds and 0 ad units.
  - Verified: `/stats` kept its ad unit.
- **Commercial zones.** The Shop route and every ad unit are commercial zones, where photo components refuse any Getty-sourced photo, embedded or licensed. Verified: `/shop` shows 0 Getty content. A `CommercialZone reason="premium"` wrapper is ready for Premium features; none exist yet.
- **Disclosure.** The privacy policy has a Getty section explaining that it is third-party content, that Getty may collect data, set identifiers and show its own ads in the viewer, and linking Getty's privacy policy and terms. It also has Allow, Block and Ask-again controls.
- **No automatic approval.** All 340 records remain `pending-license`. Public builds strip them, so 0 ship. Approving one still requires the four-point checklist in the review panel.
- **Clean reader UI.** No rights or status labels appear in articles. The dev-only "Editorial review" chip was removed.
- **Placement audit.** `scripts/editorial/placement-audit.ts` writes `PLACEMENT-AUDIT.md` and passes 14 of 14 checks.

## 3. Compatibility review against Getty's terms

Getty's Site Terms (August 2025), Embedded Viewer section, permit embedding "for editorial purposes (meaning relating to events that are newsworthy or of public interest)". Embeds may not be used "for any commercial purpose (for example, in advertising, promotions or merchandising) or to suggest endorsement or sponsorship". They may not be used in breach of any stated restriction or outside the viewer. Getty may withdraw content and may collect data and show ads in the viewer.

| Use | Assessment |
|---|---|
| Article photos in data-led cricket analysis about real matches | Fits "editorial purposes": newsworthy events, accurate captions and Getty attribution kept |
| Embed pages with no ads or sponsor modules | Removes the clearest commercial signal on those pages. Per your instruction, this is **not** treated as proof of eligibility. |
| Viewer kept intact (no download, no image URL, attribution and Getty link preserved) | Consistent with "may not be used outside the context of the Embedded Viewer" |
| Shop, merchandise and Premium kept free of Getty photos | Consistent with the ban on promotional and merchandising use |

## 4. Questions that need Getty's permission (unresolved)

1. **Site-level commercial features.** CricField is a portfolio, but other pages carry AdSense, sponsor modules, a Shop and a "Premium" label. Does Getty consider embeds on ad-free editorial pages acceptable when the same site has commercial features elsewhere?
2. **Listing-card covers.** Dugout cards use the embedded viewer as a cover thumbnail linking to the article. Is that "editorial" use, or decorative or navigational use that Getty would not allow?
3. **AFP and partner restrictions.** Many frames carry "IMAGE RESTRICTED TO EDITORIAL USE – STRICTLY NO COMMERCIAL USE". Getty's terms forbid use "in violation of any stated restriction"; is editorial embedding on this site within those restrictions?
4. **Portfolio demonstration.** Is showing the site to recruiters, as a demonstration of engineering work, within editorial use?
5. **Viewer sizing.** CricField sizes the viewer's iframe to fill a 16:9 frame (and full card frames). Getty's viewer is not altered, but does Getty object to resizing it?
6. **Future monetisation.** If any article page later carries ads, sponsorship or paid access, the embed basis would need to be re-established, ideally in writing.

Until Getty answers, the honest position is: the embeds work, sit in an editorial context and are consent-gated, but **eligibility is not confirmed**. That is why nothing is approved automatically and public builds still ship illustrations.

## 5. Demo

On localhost:3000, open any RCB Dugout article, accept the banner (or click "Show photos"), and the official Getty viewers load in place of the illustrations. Recommended demo pages:
- `/dugout/articles/rcb-the-season-that-changed-the-conversation-around-rcb`
- `/dugout/rcb` (library and covers)
- `/privacy` (disclosure and controls)
