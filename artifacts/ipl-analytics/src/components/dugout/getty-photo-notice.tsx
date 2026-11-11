// Inline opt-in for an article's Getty photographs. Appears only when the article has photos
// served through Getty's Embedded Viewer and the reader has not consented to embedded content.
// Nothing from Getty is requested until the reader chooses to show the photos.
import { Link } from "wouter";
import { ImageIcon } from "lucide-react";
import type { EditorialImage } from "@/data/editorial-images/types";
import { grantEmbedConsent, useEmbedConsent } from "@/lib/embed-consent";
import { useCommercialZone } from "@/components/photo-policy";

export function GettyPhotoNotice({ images }: { images: (EditorialImage | undefined)[] }) {
  const consent = useEmbedConsent();
  const zone = useCommercialZone();
  const hasEmbeds = images.some((i) => i && i.source === "getty" && !i.licensedImageUrl);
  if (!hasEmbeds || consent === "granted" || zone) return null;
  return (
    <div className="-mt-2 mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400" data-getty-notice>
      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span>
        This article has photographs from Getty Images. Showing them loads Getty&apos;s viewer, which may collect data.{" "}
        <Link href="/privacy" className="text-slate-300 underline decoration-white/20 underline-offset-2 hover:text-white">
          Privacy policy
        </Link>
      </span>
      <button
        type="button"
        onClick={grantEmbedConsent}
        className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-white/10"
      >
        Show photos
      </button>
    </div>
  );
}
