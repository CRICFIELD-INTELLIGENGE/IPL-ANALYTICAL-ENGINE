// Editorial Dugout photography — rights gate, Getty embed parsing, manifest access.
//
// The single rule of this module: an image reaches a public page only when
// isPublishable() returns true. That needs an approved rights status, a
// recorded reviewer with every checklist box ticked, and source data that
// validates (a real Getty embed for "approved-embed", a self-hosted file with a
// licence for "licensed"). Pending, rejected and malformed records never render.

import manifestJson from "@/data/editorial-images/manifest.json";
import type {
  EditorialImage,
  EditorialImageManifest,
  EditorialSectionId,
} from "@/data/editorial-images/types";

export const EDITORIAL_SECTION_IDS: EditorialSectionId[] = ["hero", "s1", "s2", "s3", "s4", "s5"];

export const PUBLIC_MANIFEST = manifestJson as EditorialImageManifest;

// Getty preview, thumbnail and CDN hosts. A licensed file must be self-hosted;
// pointing at these would be hotlinking a watermarked comp, not a licence.
const GETTY_HOST = /(^|\.)(gettyimages\.[a-z.]+|gettyimages-assets\.[a-z.]+|istockphoto\.com|gettystatic\.com)$/i;
const GETTY_ASSET_PAGE = /^https:\/\/www\.gettyimages\.[a-z.]+\/detail\/(?:[a-z-]+\/[a-z0-9%-]+\/)?(\d{6,12})$/i;

/** The parameters Getty's widgets.js needs, extracted from an official embed code. */
export interface GettyEmbedParams {
  id: string;
  sig: string;
  w: string;
  h: string;
  items: string;
  caption: boolean;
  tld: string;
  is360: boolean;
  detailUrl: string;
}

/**
 * Parse Getty's embed code (copied from the </> button on an asset page).
 * Only the exact shape Getty issues is accepted; anything else returns null,
 * so arbitrary pasted HTML can never reach the page.
 */
export function parseGettyEmbed(html: string | undefined): GettyEmbedParams | null {
  if (!html) return null;
  if (!/embed-cdn\.gettyimages\.com\/widgets\.js/.test(html)) return null;
  const load = html.match(/gie\.widgets\.load\(\{([^}]*)\}\)/);
  const anchor = html.match(/<a[^>]*class=['"]gie-single['"][^>]*href=['"]([^'"]+)['"]/i);
  if (!load || !anchor) return null;

  const field = (key: string) => {
    const m = load[1].match(new RegExp(`\\b${key}\\s*:\\s*(?:'([^']*)'|"([^"]*)"|(true|false))`));
    return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
  };
  const id = field("id");
  const sig = field("sig");
  const w = field("w");
  const h = field("h");
  const items = field("items");
  const tld = field("tld") ?? "com";
  if (!id || !sig || !w || !h || !items) return null;
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return null;
  if (!/^[A-Za-z0-9+/=_-]{8,256}$/.test(sig)) return null;
  if (!/^\d{2,4}px$/.test(w) || !/^\d{2,4}px$/.test(h)) return null;
  if (!/^\d{6,12}$/.test(items)) return null; // single-image embeds only
  if (!/^[a-z.]{2,8}$/.test(tld)) return null;

  const detailUrl = anchor[1].replace(/^\/\//, "https://").replace(/^http:/, "https:");
  if (!/^https:\/\/www\.gettyimages\.[a-z.]+\/detail\/\d{6,12}$/.test(detailUrl)) return null;
  if (!detailUrl.endsWith(`/${items}`)) return null;

  return {
    id,
    sig,
    w,
    h,
    items,
    caption: field("caption") === "true",
    tld,
    is360: field("is360") === "true",
    detailUrl,
  };
}

export function gettyAssetIdFromPage(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.trim().split(/[?#]/)[0].replace(/\/$/, "").match(GETTY_ASSET_PAGE);
  return m ? m[1] : null;
}

function isSelfHostedOrNonGetty(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !GETTY_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

/** Every reason a record cannot be published. Empty array = publishable. */
export function publishBlockers(img: EditorialImage, today: Date = new Date()): string[] {
  const out: string[] = [];
  if (img.rightsStatus !== "approved-embed" && img.rightsStatus !== "licensed") {
    out.push(`rights status is "${img.rightsStatus}"`);
    return out;
  }
  if (!EDITORIAL_SECTION_IDS.includes(img.sectionId)) out.push("unknown section id");
  if (!img.caption?.trim()) out.push("caption missing");
  if (!img.altText?.trim()) out.push("alt text missing");
  if (!img.photographerCredit?.trim()) out.push("photographer / source credit missing");

  const r = img.review;
  if (!r || !r.reviewedBy?.trim() || !r.reviewedAt) out.push("no recorded reviewer");
  if (!r || !Object.values(r.checklist ?? {}).every(Boolean) || Object.keys(r.checklist ?? {}).length < 4)
    out.push("rights checklist incomplete");
  if (img.discovery?.kind === "event-gallery") out.push("match gallery lead — choose one photo and record its asset id");
  if (img.discovery && !img.discovery.captionVerified) out.push("caption not verified on the Getty asset page");

  if (img.rightsStatus === "approved-embed") {
    if (!r?.commercialEmbedAuthorization?.trim()) out.push("Getty authorization reference for CricField commercial editorial embedding missing");
    if (img.source !== "getty") out.push('approved-embed requires source "getty"');
    const embed = parseGettyEmbed(img.embedHtml);
    if (!embed) out.push("embed code is not a valid Getty single-image embed");
    if (!img.assetId || !/^\d{6,12}$/.test(img.assetId)) out.push("Getty asset id missing or malformed");
    if (embed && img.assetId && embed.items !== img.assetId) out.push("embed code is for a different asset");
    const pageId = gettyAssetIdFromPage(img.sourcePageUrl);
    if (!pageId) out.push("Getty asset page URL missing or malformed");
    else if (img.assetId && pageId !== img.assetId) out.push("asset page URL is for a different asset");
    if (img.licensedImageUrl) out.push("approved-embed must not carry a direct image URL");
  }

  if (img.rightsStatus === "licensed") {
    if (!img.licensedImageUrl) out.push("licensed image URL missing");
    else if (!isSelfHostedOrNonGetty(img.licensedImageUrl))
      out.push("licensed image must be self-hosted (Getty preview/CDN URLs are not a licence)");
    if (img.source === "getty") out.push('a licensed Getty file uses source "licensed", not "getty"');
    if (img.source === "licensed") {
      if (!img.licence?.licensor?.trim() || !img.licence?.reference?.trim()) out.push("licence reference missing");
    }
    if (img.licence?.expires && new Date(`${img.licence.expires}T23:59:59Z`) < today) out.push("licence expired");
    if (img.embedHtml) out.push("licensed record must not carry embed code");
    if (img.assetId && gettyAssetIdFromPage(img.sourcePageUrl) !== img.assetId)
      out.push("Getty asset page URL missing or for a different asset");
  }
  return out;
}

export function isPublishable(img: EditorialImage, today?: Date): boolean {
  return publishBlockers(img, today).length === 0;
}

/** Resolves v2 plan IDs (e.g. cf-srh-001) to their corresponding manifest article ID */
export function resolveManifestArticleId(articleId: string, manifest: EditorialImageManifest = PUBLIC_MANIFEST): string {
  if (manifest.images.some((img) => img.articleId === articleId)) {
    return articleId;
  }
  const m = articleId.toLowerCase().match(/^cf-([a-z]+)-(\d+)$/);
  if (m) {
    const team = m[1];
    const num = parseInt(m[2], 10);
    const legacyNum = ((num - 1) % 10) + 1;
    const legacyId = `art-${team}-${String(legacyNum).padStart(2, "0")}`;
    if (manifest.images.some((img) => img.articleId === legacyId)) {
      return legacyId;
    }
  }
  return articleId;
}

/**
 * Public lookup used by the article page. Returns at most one publishable
 * image per section; anything that fails the gate is silently skipped so the
 * placement stays empty (or falls back to the original cover illustration).
 */
export function getPublishedArticleImages(
  articleId: string,
  manifest: EditorialImageManifest = PUBLIC_MANIFEST,
): Partial<Record<EditorialSectionId, EditorialImage>> {
  const targetId = resolveManifestArticleId(articleId, manifest);
  const out: Partial<Record<EditorialSectionId, EditorialImage>> = {};
  for (const img of manifest.images) {
    if (img.articleId !== targetId || out[img.sectionId]) continue;
    if (isPublishable(img) || isLocalPreviewable(img)) out[img.sectionId] = img;
  }
  return out;
}

/**
 * Local preview only. True for a Getty candidate whose official embed code is valid for its own
 * asset, whatever its approval state (except "rejected"). It grants no permission to publish:
 * it is honoured only in development builds, and public builds strip every unapproved record
 * from the manifest. Publication still goes through isPublishable() alone.
 */
export function isLocalPreviewable(img: EditorialImage): boolean {
  if (!import.meta.env?.DEV) return false;
  if (img.source !== "getty" || img.rightsStatus === "rejected" || img.licensedImageUrl) return false;
  const embed = parseGettyEmbed(img.embedHtml);
  return Boolean(embed && img.assetId && embed.items === img.assetId);
}

/** Development-only candidate lookup for the localhost preview; independent of publication approval. */
export function getLocalEmbedImages(
  articleId: string,
  manifest: EditorialImageManifest = PUBLIC_MANIFEST,
): Partial<Record<EditorialSectionId, EditorialImage>> {
  const targetId = resolveManifestArticleId(articleId, manifest);
  const out: Partial<Record<EditorialSectionId, EditorialImage>> = {};
  for (const img of manifest.images) {
    if (img.articleId !== targetId || out[img.sectionId]) continue;
    if (isLocalPreviewable(img)) out[img.sectionId] = img;
  }
  return out;
}

/**
 * The header photo for an article, as the article page itself would show it:
 * an approved image. Local development never grants usage permission. Used for cover photos on the Dugout listing cards.
 */
export function getArticleHeroImage(articleId: string): EditorialImage | undefined {
  const published = getPublishedArticleImages(articleId);
  if (published.hero) return published.hero;
  if (published.s1) return published.s1;
  if (published.s2) return published.s2;
  if (published.s3) return published.s3;
  if (published.s4) return published.s4;
  if (published.s5) return published.s5;

  if (import.meta.env?.DEV) {
    const local = getLocalEmbedImages(articleId);
    return local.hero ?? local.s1 ?? local.s2 ?? local.s3 ?? local.s4 ?? local.s5;
  }
  return undefined;
}

/** Key for a review record: one article section can hold several candidates. */
export function imageKey(img: Pick<EditorialImage, "articleId" | "sectionId" | "assetId" | "licensedImageUrl" | "sourcePageUrl">) {
  return `${img.articleId}|${img.sectionId}|${img.assetId ?? img.licensedImageUrl ?? img.sourcePageUrl ?? "new"}`;
}

/**
 * True when this build can show a Getty Embedded Viewer anywhere: an approved embed in the
 * public manifest. The consent banner
 * asks about embedded content only when this is true.
 */
export function gettyEmbedsPossible(manifest: EditorialImageManifest = PUBLIC_MANIFEST): boolean {
  return manifest.images.some(
    (img) =>
      img.source === "getty" &&
      !img.licensedImageUrl &&
      isPublishable(img),
  );
}
