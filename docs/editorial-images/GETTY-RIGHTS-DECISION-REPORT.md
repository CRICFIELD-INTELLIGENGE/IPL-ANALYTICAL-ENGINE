# Getty rights gate — decision report (2026-10-26)

**Scope.** This audits the 990 Getty hero candidates on the engine articles against:
- CricField's rights gate;
- Getty's current official terms;
- CricField's intended use: a free, public cricket analytics and editorial portfolio for job applications.

The gate was not modified and nothing was approved. Per-record evidence is in `GETTY-RIGHTS-AUDIT-990.csv`, in this folder.

**Bottom line.** All 990 are technically embeddable today. **None has permission to be published on CricField as it is currently configured.** The deciding issue is not the photos themselves but the site: Getty's free embed is offered for non-commercial sites, and CricField's public build carries live advertising, a priced Shop and a sponsor module.

---

## 1. What Getty's official terms permit

Sources, read on 2026-10-26:
- Getty Images **Site Terms**, "Last Updated: August 2025", *Embedded Viewer* section (`gettyimages.com/company/terms`, served as gettyimages.in);
- Getty's **Embed** page (`gettyimages.com/resources/embed`).

The terms, paraphrased:
- **Where Getty enables it,** anyone may embed Getty content on a website, blog or social platform through the Embedded Viewer, free of charge. Not every image is embeddable, availability can change without notice, and Getty can withdraw an image. You must stop using an embed promptly if Getty asks.
- **Editorial purposes only:** content relating to newsworthy events or matters of public interest.
- **Not allowed:**
  - any commercial purpose, with Getty's examples being advertising, promotions and merchandising;
  - anything that suggests endorsement or sponsorship;
  - use in breach of any stated restriction;
  - unlawful use;
  - use outside the Embedded Viewer.
- **Getty's rights in the viewer:** Getty may collect data through the viewer and may place its own ads in it without paying you.
- **Getty's Embed page** offers embedding for your "non‑commercial website or blog".
- **Elsewhere in the Site Terms:**
  - automated data gathering is prohibited (robots, data mining and similar extraction methods);
  - commercialising Getty content requires specific written authorisation.

**What the terms do *not* say.** They do not require a written authorization for an ordinary free editorial embed on a non-commercial site. The embed permission comes from the terms themselves. Written authorization, or a paid licence, is what you need when a use falls *outside* those terms, such as a commercial use.

## 2. The written-authorization requirement in CricField's gate

`publishBlockers()` in `src/lib/editorial-images.ts` blocks every `approved-embed` record that lacks `review.commercialEmbedAuthorization`, described as "Written Getty authorization covering embedding on CricField with advertising and commercial features". `release-filter.ts` applies the same rule to public builds.

**Does it apply to every eligible free editorial embed, or only to commercial uses?**
- **Under Getty's terms, only to commercial uses.** A genuinely non-commercial editorial site needs no written authorization, only compliance with the conditions in section 1.
- **CricField's gate applies it to every embed.** It does so because it assumes CricField is a commercial site, and it is not wrong to assume that today (see section 3).

That makes the requirement a deliberate CricField policy that is stricter than Getty's baseline, not a misreading of the terms. Whether to keep it is your decision. It should stay as long as the public site has commercial features.

## 3. What CricField currently does

| Feature | Found in the code | Bearing on the free embed |
|---|---|---|
| AdSense | `VITE_ADSENSE_CLIENT` is set to a real publisher ID in `.env`; `AdVessel` and `AdSlot` render on 18 routes | The site carries advertising. Ads are suppressed on pages showing a Getty embed, but the site as a whole is ad-supported |
| Shop | `/shop` lists priced products (₹299–₹3,499) with a cart; no payment integration found | Presents as merchandising. It is a commercial zone with Getty excluded, but it is still part of the site |
| Sponsor module | A "Sponsored Partner" box on article pages, wrapped in `SponsorModule` | Hidden while an embed is on the page. Its presence elsewhere still suggests sponsorship |
| "Premium" | Only a "PREMIUM V2.4" label in the layout; no paywall found | Low risk as code, but it reads as a paid tier |
| Consent | The consent banner has a separate "embedded content" choice; Getty loads only after consent; the privacy page discloses Getty | Meets Getty's data-collection disclosure point |
| Attribution | The official snippet's ID, signature, size and asset are loaded through Getty's `widgets.js`; captions and credits are kept | The viewer is Getty's own. Card thumbnails stretch the iframe to fill the frame (`fit`), which could crop Getty's attribution bar (see section 5) |
| Release gate | Public builds ship only `approved-embed` with an authorization, or `licensed` | Verified: the production build ships 0 of 1,330 Getty records |

## 4. The 990 candidates — technical embeddability vs permission

**Technical embeddability (all 990 = yes):**

| Evidence | Result |
|---|---|
| Getty search data flagged `isEmbeddable` at selection time | 990 / 990 |
| Official embed code from Getty's embed preview, for the same asset | 990 / 990 |
| Asset page URL well-formed and matches the asset | 990 / 990 |
| Rendered a Getty viewer on a localhost test page (26 Oct 2026) | 990 / 990 |

**Permission to publish (all 990 = no):**

| Checklist / gate item | Status |
|---|---|
| `rightsStatus` | 990 `pending-license` |
| Human review recorded | 0 / 990 |
| 1. Usage allowed for this asset | **Not satisfied for CricField.** The Embed option exists, but it is offered for non-commercial sites, and CricField is not one as configured |
| 2. Editorial context only | **Partly satisfied.** Articles are analysis of public-interest sport, and ads and sponsors are hidden beside embeds. The site-level commercial context is unresolved |
| 3. Matches the section context | **Unverified.** Selection was automatic by caption. 40 photos fall outside their article's season range; 80 have no comparable season; there is a known name mismatch ("Ravindra"); a few match sessions are reused heavily |
| 4. Attribution intact | **Technically satisfied** for article pages. **Uncertain** for card thumbnails (fit/crop) |
| Caption read on the Getty asset page | 0 / 990. Captions came from search data, and the `captionVerified` flags I had wrongly set to true are now corrected to false |
| Stated restrictions recorded | **Incomplete.** My export trimmed trailing "IMAGE RESTRICTED TO EDITORIAL USE – STRICTLY NO COMMERCIAL USE" notes from many captions, likely including a good share of the 488 AFP-credited photos; 2 still show it. Restrictions must be re-read on each asset page |
| Written commercial-embed authorization | 0 / 990 |

**A process issue to disclose.** The candidate pool was collected by scripted, rate-limited requests to Getty's search pages, roughly 120 searches and 990 embed-code requests. Getty's Site Terms prohibit robots and similar data-gathering methods. Treat the pool as leads only. Before any photo goes public, confirm it by hand on its asset page with the Embed (</>) button, which is what checklist item 1 already describes. Do not run further automated collection.

**The 340 earlier records.** They are marked `approved-embed` by the "Editorial Desk", but they have no authorization reference, so the gate correctly keeps them out of public builds (`check-editorial-images.ts` reports 340 failures). The same site-level analysis applies to them.

## 5. What remains uncertain

1. **Is a CricField without ads, Shop, sponsors or "Premium" a "non-commercial website"?** For example, a portfolio build with those features turned off. That reading seems likely to fit, but Getty decides.
2. **Is a job-seeking portfolio a commercial purpose?** It promotes you rather than a product. Getty's examples (advertising, promotions, merchandising) don't obviously cover it, but the terms don't address it.
3. **Is page-level suppression of ads enough?** Ads, Shop and sponsors stay elsewhere on the same domain. Getty's FAQ frames eligibility by *site*; nothing in the terms says page separation is sufficient.
4. **Card thumbnails:** whether stretching or cropping the viewer to fill a card counts as altering the Embedded Viewer.
5. **Per-image restrictions,** where captions were trimmed.
6. **Whether each image is still embeddable,** since availability can change without notice.

## 6. Evidence needed before public release

Choose one path; each needs its own evidence.

**Path A — portfolio build with no commercial features (closest to the free terms)**
1. A public deployment with **AdSense off** (`VITE_ADSENSE_CLIENT` unset in that build), **Shop removed or not linked**, the **sponsor module removed**, and no paid or "Premium" wording. Keep a build log or screenshots as evidence.
2. **Written confirmation from Getty** that this site qualifies for the free Embedded Viewer: the domain, its non-commercial nature, and its use as an editorial portfolio. This resolves uncertainties 1–3.
3. Only if Getty confirms, decide whether to keep the gate's written-authorization rule (store Getty's reply as `commercialEmbedAuthorization`) or relax it for this build. That is a policy change only you should make.

**Path B — keep the commercial features**
1. A **written Getty licence or authorization** covering embedding on an ad-supported site with a Shop and sponsorship, recorded as the `commercialEmbedAuthorization` reference. Without it, keep Getty off the public site.

**Either path, for every photo you publish**
1. Open the asset page by hand and confirm the Embed (</>) option is shown on the day.
2. Read the **full caption and any restriction note** on the asset page, then set `captionVerified: true`.
3. Confirm **season and context** fit, and replace the 40 out-of-season picks and the "Ravindra" mismatch.
4. Tick the **four checklist items** with your name and date in `review`.
5. Check **card thumbnails** keep Getty's attribution visible, or show embeds on article pages only.
6. Keep a **takedown process**: if Getty asks, remove the photo promptly.

**Path C — launch without Getty**
This works today with no further evidence. Every slot falls back to the CricField illustration.

## 7. Localhost preview

The localhost preview is now independent of publication approval. A recent gate change had made `getLocalEmbedImages()` and the figure components require full publishability, which stopped every photo previewing. The gate itself is unchanged: `publishBlockers`, `isPublishable`, `release-filter.ts` and `types.ts` are untouched. The changes are:
- `isLocalPreviewable()` (development builds only) accepts a Getty record whose official embed code matches its own asset, unless it is `rejected`.
- `getLocalEmbedImages()` and `EditorialImageFigure` / `EditorialCardMedia`, when `allowUnpublished` is set in development, use it.
- Embed consent and commercial-zone suppression still apply in preview.

**Verified:**
- In development, 1,330 records are previewable and 0 are publishable.
- The MI hero's only blocker is its `pending-license` status.
- The production build ships 0 of 1,330 Getty records.
- On your own browser, photos appear after you choose "Accept" for embedded content.
