// Editorial Dugout photography — metadata types.
// Image records live in manifest.json, separate from the article bodies in
// editorial-magazine-data.ts. Only records that pass isPublishable()
// (src/lib/editorial-images.ts) are ever rendered on a public page.

/** "hero" is the article header; s1–s5 are the five narrative segments. */
export type EditorialSectionId = "hero" | "s1" | "s2" | "s3" | "s4" | "s5";

export type EditorialImageSource = "getty" | "licensed" | "original";

export type EditorialRightsStatus =
  | "approved-embed" // Getty Embedded Viewer, eligibility confirmed by a reviewer
  | "licensed" // self-hosted file covered by a recorded licence (or CricField original)
  | "pending-license" // matched to the story, licence not yet confirmed — never rendered publicly
  | "pending-review" // candidate only — never rendered publicly
  | "rejected"; // reviewed and turned down — kept for the audit trail

/** How a candidate was found, and how far its caption has been checked. */
export interface EditorialImageDiscovery {
  /** "asset" = one Getty photo; "event-gallery" = the Getty gallery for the exact match, frame not yet chosen. */
  kind: "asset" | "event-gallery";
  method: "web-search" | "getty-site" | "manual";
  query: string;
  foundAt: string; // YYYY-MM-DD
  /** Page title exactly as returned by the search, e.g. "Travis Head and Abhishek Sharma of … News Photo". */
  sourceTitle?: string;
  /** True only after someone has read the full caption on the Getty asset page. */
  captionVerified: boolean;
  /** Why this photo fits the segment, and anything that does not fit (e.g. a different season). */
  fitNotes?: string;
}

/** What the reviewer confirmed before approving. Every box must be true. */
export interface EditorialRightsChecklist {
  /** The asset page shows Getty's Embed (</>) option, or a licence covers this use. */
  usageAllowedForAsset: boolean;
  /** The image accompanies newsworthy reporting and does not promote a product, service or CricField itself. */
  editorialContextOnly: boolean;
  /** Team kit, players and season in the photo match the section it sits in. */
  matchesSectionContext: boolean;
  /** Getty attribution / watermark / embed chrome is left intact. */
  attributionIntact: boolean;
}

export interface EditorialImageLicence {
  licensor: string; // e.g. "Getty Images", "CricField (original)"
  reference: string; // invoice / licence / agreement number
  /** ISO date; the image stops rendering after this day. */
  expires?: string;
}

export interface EditorialImageReview {
  /** Written Getty authorization covering embedding on CricField with advertising and commercial features. */
  commercialEmbedAuthorization?: string;
  reviewedBy: string;
  reviewedAt: string; // ISO timestamp
  checklist: EditorialRightsChecklist;
  notes?: string;
}

export interface EditorialImage {
  articleId: string;
  sectionId: EditorialSectionId;
  source: EditorialImageSource;
  assetId?: string;
  sourcePageUrl?: string;
  /** Getty's embed code, pasted verbatim from the asset page. */
  embedHtml?: string;
  /** Self-hosted path ("/editorial/…") for licensed or original files. */
  licensedImageUrl?: string;
  /** Intrinsic size of a licensed file, used to reserve its aspect ratio. */
  width?: number;
  height?: number;
  caption: string;
  photographerCredit?: string;
  altText: string;
  /** Date the photo was taken (from the Getty caption), YYYY-MM-DD. */
  matchDate?: string;
  /** Teams / players visible in the photo, as stated in the source caption. */
  depicts?: string[];
  rightsStatus: EditorialRightsStatus;
  licence?: EditorialImageLicence;
  review?: EditorialImageReview;
  discovery?: EditorialImageDiscovery;
}

export interface EditorialImageManifest {
  version: 1;
  updatedAt: string;
  images: EditorialImage[];
}
