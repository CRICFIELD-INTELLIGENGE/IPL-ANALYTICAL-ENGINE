// Public-build filter for the editorial image manifest. Dependency-free so the
// Vite config can import it. In a public build only approved records are
// shipped; pending-license / pending-review / rejected candidates (Getty asset
// ids, captions, source links) are removed from the bundle entirely, so every
// slot that only had a candidate falls back to CricField's own visuals.

const RELEASABLE = new Set(["approved-embed", "licensed"]);

export interface ReleaseFilterResult {
  json: string;
  kept: number;
  stripped: number;
}

export function filterManifestForRelease(source: string): ReleaseFilterResult {
  const manifest = JSON.parse(source) as { images?: Array<{ rightsStatus?: string; review?: { commercialEmbedAuthorization?: string } }> };
  const images = Array.isArray(manifest.images) ? manifest.images : [];
  const kept = images.filter((img) => RELEASABLE.has(img.rightsStatus ?? ""));
  return {
    json: JSON.stringify({ ...manifest, images: kept }),
    kept: kept.length,
    stripped: images.length - kept.length,
  };
}
