import type { IndexEntry } from "@/data/editorial/schema";
import { getArticleHeroImage } from "@/lib/editorial-images";
import { EditorialCardMedia } from "@/components/dugout/editorial-image-figure";
import { grantEmbedConsent, useEmbedConsent } from "@/lib/embed-consent";

/** Render the article's mapped photo, including approved Getty viewers.
 * Missing/blocked photos get an article-specific cover, never a shared team banner.
 */
export function HomeLatestMedia({ entry }: { entry: IndexEntry }) {
  const image = getArticleHeroImage(entry.id);
  const consent = useEmbedConsent();
  const fallback = (
    <div className="ref-latest-cover" data-article-cover={entry.id}>
      <span>{entry.franchise} · CricField</span>
      <strong>{entry.title}</strong>
      {image?.source === "getty" && consent !== "granted" && (
        <button type="button" onClick={grantEmbedConsent}>Load photograph</button>
      )}
    </div>
  );
  return <div className="ref-latest-media" data-mapped-asset={image?.assetId ?? image?.licensedImageUrl ?? entry.id}>
    {image ? <EditorialCardMedia image={image} aspect="video" preserveAspectRatio fallback={fallback} /> : fallback}
  </div>;
}
