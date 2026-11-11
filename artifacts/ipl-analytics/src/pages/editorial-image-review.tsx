// Editorial Image Review — internal page (hidden from production unless
// VITE_ENABLE_ADMIN_PAGES=true). Editors add Getty candidates they found by
// hand, tick the rights checklist and approve or reject. Decisions are kept in
// this browser as a draft and exported as manifest.json; nothing is public
// until that file is committed to src/data/editorial-images/.

import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { ExternalLink, Search, Download, Copy, RotateCcw, CheckCircle2, XCircle, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { EDITORIAL_ARTICLES } from "@/data/editorial-magazine-data";
import type {
  EditorialImage,
  EditorialImageManifest,
  EditorialRightsChecklist,
} from "@/data/editorial-images/types";
import { PUBLIC_MANIFEST, gettyAssetIdFromPage, imageKey, parseGettyEmbed, publishBlockers } from "@/lib/editorial-images";
import { planArticleImages, type ImageSlotPlan } from "@/lib/editorial-image-plan";
import { EditorialImageFigure } from "@/components/dugout/editorial-image-figure";

const DRAFT_KEY = "cricfield.editorial-images.draft.v1";
const REVIEWER_KEY = "cricfield.editorial-images.reviewer";

function readDraft(): EditorialImageManifest {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EditorialImageManifest;
      if (parsed?.version === 1 && Array.isArray(parsed.images)) return parsed;
    }
  } catch {
    /* storage unavailable — fall back to the committed manifest */
  }
  return structuredClone(PUBLIC_MANIFEST);
}

function writeDraft(m: EditorialImageManifest) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(m));
  } catch {
    /* draft persistence is a convenience only */
  }
}

const EMPTY_CHECKLIST: EditorialRightsChecklist = {
  usageAllowedForAsset: false,
  editorialContextOnly: false,
  matchesSectionContext: false,
  attributionIntact: false,
};

const CHECKLIST_LABELS: Record<keyof EditorialRightsChecklist, string> = {
  usageAllowedForAsset: "Asset page offers Getty Embed (</>) for this image — or a recorded licence covers this use",
  editorialContextOnly: "Used beside newsworthy reporting only; it does not promote CricField, a product or a sponsor",
  matchesSectionContext: "Getty caption confirms the franchise kit, players and season this segment discusses",
  attributionIntact: "Getty attribution, credit and embed chrome are left unaltered",
};

const STATUS_STYLE: Record<EditorialImage["rightsStatus"], string> = {
  "approved-embed": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  licensed: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "pending-license": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "pending-review": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

const inputCls =
  "w-full px-2.5 py-1.5 text-xs rounded-md bg-black/40 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-sky-500";

// ── Candidate form ───────────────────────────────────────────────────────────

type SourceKind = "getty-embed" | "licensed" | "original";

function CandidateForm({ articleId, slot, onAdd }: { articleId: string; slot: ImageSlotPlan; onAdd: (img: EditorialImage) => void }) {
  const [kind, setKind] = useState<SourceKind>("getty-embed");
  const [pageUrl, setPageUrl] = useState("");
  const [embedHtml, setEmbedHtml] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [size, setSize] = useState({ w: "", h: "" });
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [alt, setAlt] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [depicts, setDepicts] = useState("");
  const [licence, setLicence] = useState({ licensor: "", reference: "", expires: "" });
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    if (!caption.trim() || !alt.trim()) return setError("Caption and alt text are required.");
    let img: EditorialImage;
    if (kind === "getty-embed") {
      const assetId = gettyAssetIdFromPage(pageUrl);
      const embed = parseGettyEmbed(embedHtml);
      if (!assetId) return setError("Paste the Getty asset page URL (…/detail/…/<asset id>).");
      if (!embed) return setError("Paste the full embed code from the asset page's </> Embed button.");
      if (embed.items !== assetId) return setError(`Embed code is for asset ${embed.items}, page is ${assetId}.`);
      img = {
        articleId,
        sectionId: slot.sectionId,
        source: "getty",
        assetId,
        sourcePageUrl: pageUrl.trim().split(/[?#]/)[0],
        embedHtml: embedHtml.trim(),
        caption: caption.trim(),
        photographerCredit: credit.trim() || undefined,
        altText: alt.trim(),
        matchDate: matchDate || undefined,
        depicts: depicts ? depicts.split(",").map((d) => d.trim()).filter(Boolean) : undefined,
        rightsStatus: "pending-license",
      };
    } else {
      if (!fileUrl.trim()) return setError("Self-hosted file path is required (e.g. /editorial/srh/hero.webp).");
      img = {
        articleId,
        sectionId: slot.sectionId,
        source: kind === "licensed" ? "licensed" : "original",
        assetId: kind === "licensed" ? gettyAssetIdFromPage(pageUrl) ?? undefined : undefined,
        sourcePageUrl: pageUrl.trim() || undefined,
        licensedImageUrl: fileUrl.trim(),
        width: Number(size.w) || undefined,
        height: Number(size.h) || undefined,
        caption: caption.trim(),
        photographerCredit: credit.trim() || undefined,
        altText: alt.trim(),
        matchDate: matchDate || undefined,
        depicts: depicts ? depicts.split(",").map((d) => d.trim()).filter(Boolean) : undefined,
        rightsStatus: "pending-license",
        licence:
          licence.licensor || licence.reference
            ? { licensor: licence.licensor.trim(), reference: licence.reference.trim(), expires: licence.expires || undefined }
            : undefined,
      };
    }
    onAdd(img);
    setPageUrl("");
    setEmbedHtml("");
    setFileUrl("");
    setCaption("");
    setCredit("");
    setAlt("");
    setMatchDate("");
    setDepicts("");
  };

  return (
    <div className="mt-3 p-3 rounded-lg border border-dashed border-gray-700 space-y-2">
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {(["getty-embed", "licensed", "original"] as SourceKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-2 py-1 rounded border cursor-pointer ${kind === k ? "border-sky-500 text-sky-300 bg-sky-500/10" : "border-gray-700 text-gray-400"}`}
          >
            {k === "getty-embed" ? "Getty embed" : k === "licensed" ? "Licensed file" : "CricField original"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {kind !== "original" && (
          <input className={inputCls} placeholder="Getty asset page URL (https://www.gettyimages.com/detail/…)" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
        )}
        {kind === "getty-embed" ? (
          <textarea className={`${inputCls} md:col-span-2 font-mono h-20`} placeholder="Embed code, pasted exactly as Getty supplies it" value={embedHtml} onChange={(e) => setEmbedHtml(e.target.value)} />
        ) : (
          <>
            <input className={inputCls} placeholder="Self-hosted file path (/editorial/…)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
            <div className="flex gap-2">
              <input className={inputCls} placeholder="width px" value={size.w} onChange={(e) => setSize({ ...size, w: e.target.value })} />
              <input className={inputCls} placeholder="height px" value={size.h} onChange={(e) => setSize({ ...size, h: e.target.value })} />
            </div>
          </>
        )}
        {kind === "licensed" && (
          <div className="md:col-span-2 grid grid-cols-3 gap-2">
            <input className={inputCls} placeholder="Licensor" value={licence.licensor} onChange={(e) => setLicence({ ...licence, licensor: e.target.value })} />
            <input className={inputCls} placeholder="Licence / invoice ref" value={licence.reference} onChange={(e) => setLicence({ ...licence, reference: e.target.value })} />
            <input className={inputCls} type="date" title="Licence expiry" value={licence.expires} onChange={(e) => setLicence({ ...licence, expires: e.target.value })} />
          </div>
        )}
        <input className={`${inputCls} md:col-span-2`} placeholder="Editorial caption (from the Getty caption, facts only)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <input className={inputCls} placeholder="Photographer credit (e.g. Photo by … / Getty Images)" value={credit} onChange={(e) => setCredit(e.target.value)} />
        <input className={inputCls} placeholder="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} />
        <input className={inputCls} type="date" title="Match date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
        <input className={inputCls} placeholder="Depicts (comma-separated players / teams)" value={depicts} onChange={(e) => setDepicts(e.target.value)} />
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <button onClick={submit} className="px-3 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer">
        Add as pending candidate
      </button>
    </div>
  );
}

// ── One candidate with Approve / Reject ──────────────────────────────────────

function CandidateCard({
  img,
  reviewer,
  onUpdate,
  onRemove,
}: {
  img: EditorialImage;
  reviewer: string;
  onUpdate: (next: EditorialImage) => void;
  onRemove: () => void;
}) {
  const [checklist, setChecklist] = useState<EditorialRightsChecklist>(img.review?.checklist ?? EMPTY_CHECKLIST);
  const [notes, setNotes] = useState(img.review?.notes ?? "");
  const [authorization, setAuthorization] = useState(img.review?.commercialEmbedAuthorization ?? "");
  const [preview, setPreview] = useState(false);
  const [captionVerified, setCaptionVerified] = useState(img.discovery?.captionVerified ?? false);
  const [lic, setLic] = useState({ asset: "", page: "", file: "", w: "", h: "", ref: "", expires: "", credit: "" });

  const isPending = img.rightsStatus === "pending-review" || img.rightsStatus === "pending-license";
  const isGallery = img.discovery?.kind === "event-gallery";
  // A Getty candidate with an official embed code can be approved as an embed;
  // everything else (and any candidate once a licensed file is entered) becomes "licensed".
  const asEmbed = img.source === "getty" && Boolean(img.embedHtml) && !lic.file;
  const targetStatus: EditorialImage["rightsStatus"] = asEmbed ? "approved-embed" : "licensed";
  const review = { commercialEmbedAuthorization: authorization.trim() || undefined, reviewedBy: reviewer.trim(), reviewedAt: new Date().toISOString(), checklist, notes: notes || undefined };
  const discovery = img.discovery
    ? { ...img.discovery, captionVerified, ...(isGallery && lic.asset ? { kind: "asset" as const } : {}) }
    : undefined;
  const proposed: EditorialImage = asEmbed
    ? { ...img, rightsStatus: "approved-embed", review, discovery }
    : {
        ...img,
        source: img.source === "getty" ? "licensed" : img.source,
        assetId: lic.asset || img.assetId,
        sourcePageUrl: lic.page || img.sourcePageUrl,
        embedHtml: undefined,
        licensedImageUrl: lic.file || img.licensedImageUrl,
        photographerCredit: lic.credit || img.photographerCredit,
        width: Number(lic.w) || img.width,
        height: Number(lic.h) || img.height,
        licence: lic.ref ? { licensor: "Getty Images", reference: lic.ref, expires: lic.expires || undefined } : img.licence,
        rightsStatus: "licensed",
        review,
        discovery,
      };
  const blockers = publishBlockers(proposed);
  const liveBlockers = publishBlockers(img);

  return (
    <div className="rounded-lg border border-gray-800 bg-black/20 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`px-2 py-0.5 rounded border font-mono uppercase ${STATUS_STYLE[img.rightsStatus]}`}>{img.rightsStatus}</span>
        <span className="text-gray-400 font-mono">{img.source}{img.assetId ? ` · #${img.assetId}` : ""}</span>
        {img.sourcePageUrl && (
          <a href={img.sourcePageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-400 hover:underline">
            Getty source <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <button onClick={() => setPreview((p) => !p)} className="text-gray-400 hover:text-white cursor-pointer underline">
          {preview ? "Hide preview" : "Preview"}
        </button>
        <button onClick={onRemove} className="ml-auto text-gray-500 hover:text-red-400 cursor-pointer">Remove</button>
      </div>
      <p className="text-xs text-gray-200">{img.caption}</p>
      <p className="text-[11px] text-gray-500 font-mono">
        {img.photographerCredit || "No credit"} {img.matchDate && `· ${img.matchDate}`} {img.depicts?.length ? `· ${img.depicts.join(", ")}` : ""}
      </p>
      {img.review && (
        <p className="text-[11px] text-gray-500">
          Reviewed by {img.review.reviewedBy} on {img.review.reviewedAt.slice(0, 10)}
          {img.review.notes ? ` — ${img.review.notes}` : ""}
        </p>
      )}
      {img.discovery && (
        <div className="text-[11px] text-gray-400 space-y-0.5">
          <p>
            <span className="font-mono uppercase text-gray-500">{img.discovery.kind}</span> · found by {img.discovery.method} on {img.discovery.foundAt}
            {!img.discovery.captionVerified && <span className="text-red-300/80"> · caption not yet verified on Getty</span>}
          </p>
          {img.discovery.sourceTitle && <p className="text-gray-300">“{img.discovery.sourceTitle}”</p>}
          {img.discovery.fitNotes && <p>{img.discovery.fitNotes}</p>}
        </div>
      )}
      {preview && <EditorialImageFigure image={img} allowUnpublished />}

      {isPending || liveBlockers.length > 0 ? (
        <div className="space-y-1.5 pt-2 border-t border-gray-800">
          {asEmbed && <input className={inputCls} aria-label="Getty commercial embed authorization reference" placeholder="Written Getty authorization covering CricField commercial editorial use" value={authorization} onChange={(e) => setAuthorization(e.target.value)} />}
          {!asEmbed && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {isGallery && (
                <>
                  <input className={inputCls} placeholder="Chosen frame: asset id" value={lic.asset} onChange={(e) => setLic({ ...lic, asset: e.target.value.trim() })} />
                  <input className={`${inputCls} md:col-span-2`} placeholder="Chosen frame: Getty asset page URL" value={lic.page} onChange={(e) => setLic({ ...lic, page: e.target.value.trim() })} />
                </>
              )}
              <input className={inputCls} placeholder="Licensed file (/editorial/…)" value={lic.file} onChange={(e) => setLic({ ...lic, file: e.target.value.trim() })} />
              <input className={inputCls} placeholder="width px" value={lic.w} onChange={(e) => setLic({ ...lic, w: e.target.value })} />
              <input className={inputCls} placeholder="height px" value={lic.h} onChange={(e) => setLic({ ...lic, h: e.target.value })} />
              <input className={inputCls} placeholder="Getty licence / invoice ref" value={lic.ref} onChange={(e) => setLic({ ...lic, ref: e.target.value })} />
              <input className={inputCls} type="date" title="Licence expiry" value={lic.expires} onChange={(e) => setLic({ ...lic, expires: e.target.value })} />
              {!img.photographerCredit && (
                <input className={`${inputCls} md:col-span-3`} placeholder="Credit from the Getty page (e.g. Photo by … / Getty Images)" value={lic.credit} onChange={(e) => setLic({ ...lic, credit: e.target.value })} />
              )}
            </div>
          )}
          {img.discovery && (
            <label className="flex items-start gap-2 text-[11px] text-gray-300 cursor-pointer">
              <input type="checkbox" checked={captionVerified} onChange={(e) => setCaptionVerified(e.target.checked)} className="mt-0.5" />
              <span>I read the full caption on the Getty asset page and the date, teams and players are as recorded</span>
            </label>
          )}
          {(Object.keys(CHECKLIST_LABELS) as (keyof EditorialRightsChecklist)[]).map((k) => (
            <label key={k} className="flex items-start gap-2 text-[11px] text-gray-300 cursor-pointer">
              <input type="checkbox" checked={checklist[k]} onChange={(e) => setChecklist({ ...checklist, [k]: e.target.checked })} className="mt-0.5" />
              <span>{CHECKLIST_LABELS[k]}</span>
            </label>
          ))}
          <input className={inputCls} placeholder="Review notes (licence terms, caveats)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {blockers.length > 0 && (
            <ul className="text-[11px] text-amber-400 list-disc pl-4">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button
              disabled={blockers.length > 0}
              onClick={() => onUpdate(proposed)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-500 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {asEmbed ? "Approve as embed" : "Activate licence"}
            </button>
            <button
              disabled={!reviewer.trim()}
              onClick={() =>
                onUpdate({ ...img, rightsStatus: "rejected", review: { reviewedBy: reviewer.trim(), reviewedAt: new Date().toISOString(), checklist, notes: notes || undefined } })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold border border-red-500/40 text-red-400 disabled:opacity-30 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800 text-[11px]">
          {liveBlockers.length === 0 ? (
            <span className="text-emerald-400 inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Publishable</span>
          ) : (
            <span className="text-amber-400">Not public: {liveBlockers.join("; ")}</span>
          )}
          <button onClick={() => onUpdate({ ...img, rightsStatus: "pending-license", review: undefined })} className="ml-auto text-gray-400 hover:text-white underline cursor-pointer">
            Return to pending
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Filter = "all" | "no-images" | "pending" | "approved";

export default function EditorialImageReviewPage() {
  const [draft, setDraftState] = useState<EditorialImageManifest>(readDraft);
  const [reviewer, setReviewerState] = useState(() => {
    try {
      return localStorage.getItem(REVIEWER_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [team, setTeam] = useState("ALL");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const setDraft = (m: EditorialImageManifest) => {
    const next = { ...m, updatedAt: new Date().toISOString() };
    setDraftState(next);
    writeDraft(next);
  };
  const setReviewer = (v: string) => {
    setReviewerState(v);
    try {
      localStorage.setItem(REVIEWER_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const plans = useMemo(() => EDITORIAL_ARTICLES.map(planArticleImages), []);
  const byArticle = useMemo(() => {
    const map = new Map<string, EditorialImage[]>();
    for (const img of draft.images) map.set(img.articleId, [...(map.get(img.articleId) ?? []), img]);
    return map;
  }, [draft]);

  const approvedCount = (id: string) => (byArticle.get(id) ?? []).filter((i) => publishBlockers(i).length === 0).length;
  const pendingCount = (id: string) => (byArticle.get(id) ?? []).filter((i) => i.rightsStatus === "pending-review" || i.rightsStatus === "pending-license").length;

  const visible = plans.filter((p) => {
    if (team !== "ALL" && p.teamCode !== team) return false;
    if (query && !`${p.title} ${p.players.join(" ")}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "no-images") return approvedCount(p.articleId) === 0;
    if (filter === "pending") return pendingCount(p.articleId) > 0;
    if (filter === "approved") return approvedCount(p.articleId) > 0;
    return true;
  });

  const totals = {
    approvedArticles: plans.filter((p) => approvedCount(p.articleId) > 0).length,
    approvedImages: draft.images.filter((i) => publishBlockers(i).length === 0).length,
    pending: draft.images.filter((i) => i.rightsStatus === "pending-review" || i.rightsStatus === "pending-license").length,
    rejected: draft.images.filter((i) => i.rightsStatus === "rejected").length,
  };
  const dirty = JSON.stringify(draft.images) !== JSON.stringify(PUBLIC_MANIFEST.images);

  const replaceImage = (oldImg: EditorialImage, next: EditorialImage | null) => {
    const k = imageKey(oldImg);
    const images = draft.images.flatMap((i) => (imageKey(i) === k ? (next ? [next] : []) : [i]));
    setDraft({ ...draft, images });
  };

  const exportJson = JSON.stringify(draft, null, 2) + "\n";
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout hideRightPanel>
      <div className="w-full min-h-screen bg-[#070c16] text-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <header className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-widest text-sky-400">Internal · Editorial Dugout</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Editorial Image Review</h1>
            <p className="text-sm text-gray-400 max-w-3xl">
              Search Getty with each segment's plan, paste the asset page URL and its official embed code, then approve only
              after the rights checklist is complete. Changes here are a local draft: export <code className="text-gray-300">manifest.json</code> and
              commit it to <code className="text-gray-300">src/data/editorial-images/</code> to publish. Pending and rejected records never render publicly.
            </p>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Articles with approved images", `${totals.approvedArticles} / ${plans.length}`],
              ["Publishable images", totals.approvedImages],
              ["Pending review", totals.pending],
              ["Rejected", totals.rejected],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl border border-gray-800 bg-[#101726] p-3">
                <div className="text-[10px] font-mono uppercase text-gray-500">{label}</div>
                <div className="text-xl font-black font-mono text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-800 bg-[#101726] p-3">
            <input className={`${inputCls} max-w-[200px]`} placeholder="Reviewer name" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
            <select className={`${inputCls} max-w-[120px]`} value={team} onChange={(e) => setTeam(e.target.value)}>
              {["ALL", "SRH", "RCB", "CSK", "MI", "KKR", "RR", "DC", "PBKS", "GT", "LSG"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select className={`${inputCls} max-w-[170px]`} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All articles</option>
              <option value="no-images">Needs images / licensing</option>
              <option value="pending">Has pending candidates</option>
              <option value="approved">Has approved images</option>
            </select>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-500" />
              <input className={`${inputCls} pl-7`} placeholder="Search title or player" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex gap-2 ml-auto">
              <button onClick={download} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-500 text-slate-950 text-xs font-bold cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Export manifest.json
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(exportJson).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-700 text-xs cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy JSON"}
              </button>
              <button
                onClick={() => setDraft(structuredClone(PUBLIC_MANIFEST))}
                disabled={!dirty}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-700 text-xs disabled:opacity-30 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Discard draft
              </button>
            </div>
            {dirty && <p className="w-full text-[11px] text-amber-400">Draft differs from the committed manifest — export and commit to publish.</p>}
          </div>

          <div className="space-y-2">
            {visible.map((plan) => {
              const isOpen = open === plan.articleId;
              const imgs = byArticle.get(plan.articleId) ?? [];
              const approved = approvedCount(plan.articleId);
              const pending = pendingCount(plan.articleId);
              return (
                <section key={plan.articleId} className="rounded-xl border border-gray-800 bg-[#101726]">
                  <button onClick={() => setOpen(isOpen ? null : plan.articleId)} className="w-full text-left p-3 flex items-center gap-3 cursor-pointer">
                    <span className="text-[10px] font-mono font-bold text-gray-500 w-10 shrink-0">{plan.teamCode}</span>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">{plan.title}</span>
                    {approved > 0 && <span className="text-[10px] font-mono text-emerald-400">{approved} approved</span>}
                    {pending > 0 && <span className="text-[10px] font-mono text-amber-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" />{pending}</span>}
                    {approved === 0 && <span className="text-[10px] font-mono text-gray-500">needs licensing</span>}
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-4 space-y-4 border-t border-gray-800">
                      <div className="pt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                        <Link href={`/dugout/articles/${plan.slug}`} className="text-sky-400 hover:underline">Open article →</Link>
                        <span>Venue: {plan.venue ?? "—"}</span>
                        <span>Seasons in text: {plan.seasons.join(", ") || "—"}</span>
                        <span>Players named: {plan.players.join(", ") || "—"}</span>
                      </div>

                      {plan.slots.map((slot) => {
                        const slotImgs = imgs.filter((i) => i.sectionId === slot.sectionId);
                        return (
                          <div key={slot.sectionId} className="rounded-lg border border-gray-800 p-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                                {slot.sectionId === "hero" ? "Header" : `Segment ${slot.sectionId.slice(1)}`}
                              </span>
                              <span className="text-[10px] font-mono uppercase text-gray-500">{slot.role}</span>
                              <span className={`text-[10px] font-mono uppercase ${slot.priority === "recommended" ? "text-sky-400" : "text-gray-500"}`}>{slot.priority}</span>
                            </div>
                            <h3 className="text-sm font-bold text-white">{slot.sectionHeading}</h3>
                            <p className="text-[11px] text-gray-400">{slot.roleBrief}</p>
                            {slot.evidence[0] && <p className="text-[11px] text-gray-500 italic line-clamp-2">“{slot.evidence[0]}”</p>}
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <code className="px-2 py-1 rounded bg-black/40 text-gray-200">{slot.query}</code>
                              <a href={slot.gettySearchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-400 hover:underline">
                                Search Getty <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <ul className="text-[11px] text-gray-400 list-disc pl-4">
                              {slot.mustVerify.map((m) => <li key={m}>{m}</li>)}
                            </ul>
                            {slot.warnings.length > 0 && (
                              <ul className="text-[11px] text-amber-400/90 space-y-0.5">
                                {slot.warnings.map((w) => (
                                  <li key={w} className="flex gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}</li>
                                ))}
                              </ul>
                            )}
                            {slotImgs.map((img) => (
                              <CandidateCard
                                key={imageKey(img)}
                                img={img}
                                reviewer={reviewer}
                                onUpdate={(next) => replaceImage(img, next)}
                                onRemove={() => replaceImage(img, null)}
                              />
                            ))}
                            <CandidateForm
                              articleId={plan.articleId}
                              slot={slot}
                              onAdd={(img) => {
                                if (draft.images.some((i) => imageKey(i) === imageKey(img))) return;
                                setDraft({ ...draft, images: [...draft.images, img] });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
