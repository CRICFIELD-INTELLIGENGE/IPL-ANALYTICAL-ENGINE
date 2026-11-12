import React, { useEffect, useRef, useState } from "react";
import type { EditorialImage } from "@/data/editorial-images/types";
import { isLocalPreviewable, isPublishable, parseGettyEmbed, type GettyEmbedParams } from "@/lib/editorial-images";
import { grantEmbedConsent, useEmbedConsent } from "@/lib/embed-consent";
import { useCommercialZone, useRegisterGettyEmbed } from "@/components/photo-policy";

/**
 * Placement and consent rules shared by every editorial photo component:
 * - Getty-sourced photographs (embedded or licensed) never appear inside a commercial zone
 *   (Shop, merchandise, Premium, ad units, sponsor modules).
 * - The Getty Embedded Viewer is third-party content; it is not requested until the visitor has
 *   consented to embedded content. Until then the caller's fallback (the CricField illustration) shows.
 */
function usePhotoAllowed(image: EditorialImage, isEmbed: boolean): boolean {
  const zone = useCommercialZone();
  const consent = useEmbedConsent();
  if (zone && (image.source === "getty" || /gettyimages\./i.test(image.sourcePageUrl ?? ""))) return false;
  if (isEmbed && consent !== "granted") return false;
  return true;
}

// Getty's official embed loader. It is the same script the embed code
// references; we load it once and queue widgets exactly as that code does.
const GETTY_WIDGETS_SRC = "https://embed-cdn.gettyimages.com/widgets.js";

// Global tracking of whether Getty's embed network is reachable or blocked (e.g. localhost CloudFront 403 / adblock)
let gettyBlocked = false;
const gettyListeners = new Set<(blocked: boolean) => void>();

export function setGettyBlocked(val: boolean) {
  if (gettyBlocked !== val) {
    gettyBlocked = val;
    gettyListeners.forEach((fn) => fn(val));
  }
}

export function useGettyBlocked() {
  const [blocked, setBlocked] = useState(gettyBlocked);
  useEffect(() => {
    gettyListeners.add(setBlocked);
    return () => {
      gettyListeners.delete(setBlocked);
    };
  }, []);
  return blocked;
}

declare global {
  interface Window {
    gie?: ((cb: () => void) => void) & { q?: Array<() => void>; widgets?: { load: (o: object) => void } };
  }
}

function queueGettyWidget(p: GettyEmbedParams) {
  if (gettyBlocked) return;
  const w = window;
  if (w.gie?.widgets && typeof w.gie.widgets.load === "function") {
    try {
      w.gie.widgets.load({
        id: p.id,
        sig: p.sig,
        w: p.w,
        h: p.h,
        items: p.items,
        caption: p.caption,
        tld: p.tld,
        is360: p.is360,
      });
      return;
    } catch (err) {
      console.warn("Getty direct load warning:", err);
    }
  }

  w.gie =
    w.gie ||
    (Object.assign((c: () => void) => {
      (w.gie!.q = w.gie!.q || []).push(c);
    }, {}) as Window["gie"]);
  w.gie!(() => {
    try {
      if (w.gie?.widgets?.load) {
        w.gie.widgets.load({
          id: p.id,
          sig: p.sig,
          w: p.w,
          h: p.h,
          items: p.items,
          caption: p.caption,
          tld: p.tld,
          is360: p.is360,
        });
      }
    } catch (err) {
      console.warn("Getty queued load warning:", err);
    }
  });

  let s = document.querySelector<HTMLScriptElement>(`script[src="${GETTY_WIDGETS_SRC}"]`);
  if (!s) {
    s = document.createElement("script");
    s.src = GETTY_WIDGETS_SRC;
    s.async = true;
    s.charset = "utf-8";
    s.onload = () => {
      if (w.gie?.q && w.gie?.widgets?.load) {
        while (w.gie.q.length) {
          const fn = w.gie.q.shift();
          if (fn) {
            try { fn(); } catch (e) { /* ignore */ }
          }
        }
      }
    };
    s.onerror = () => {
      setGettyBlocked(true);
    };
    document.body.appendChild(s);
  }
}

/** Getty Embedded Viewer. Loads only when scrolled near, keeps Getty's attribution link. */
function GettyEmbed({ params, onFail, fit = false, naturalHeight = false }: { params: GettyEmbedParams; onFail: () => void; fit?: boolean; naturalHeight?: boolean }) {
  useRegisterGettyEmbed(); // internal placement accounting only
  const ref = useRef<HTMLDivElement | null>(null);
  const [queued, setQueued] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isBlocked = useGettyBlocked();
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const embedKey = `${params.items}:${params.id}`;

  useEffect(() => {
    if (isBlocked) {
      onFailRef.current();
    }
  }, [isBlocked]);

  useEffect(() => {
    if (isBlocked) return;
    const el = ref.current;
    if (!el) return;
    let done = false;
    const load = () => {
      if (done) return;
      done = true;
      io.disconnect();
      window.clearTimeout(fallback);
      // Preserve Getty's original ID and signature together. Rewriting the ID can
      // produce an "Incorrect or invalid URL" response from its signed viewer.
      const params = paramsRef.current;
      const existing = document.getElementById(params.id);
      if (existing && !el.contains(existing)) {
        onFailRef.current();
        return;
      }
      // Getty's script replaces this anchor with its viewer, so it is created
      // outside React; React only ever owns the empty container.
      const a = document.createElement("a");
      a.id = params.id;
      a.className = "gie-single";
      a.href = params.detailUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", "Getty Images Photography Embed");
      a.style.cssText = "color:#a7a7a7;text-decoration:none;font-weight:normal;border:none;display:inline-block;";
      el.replaceChildren(a);
      setQueued(true);
      queueGettyWidget(params);
    };
    // Load when scrolled near; the timer is a backstop so an embed never waits on a missed
    // intersection (fast scrolling, client-side navigation, background tabs).
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && load(), {
      rootMargin: "400px 0px",
    });
    io.observe(el);
    const fallback = window.setTimeout(load, 800);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
      el.replaceChildren();
    };
  }, [embedKey, isBlocked]);

  // Strip white backgrounds from Getty-injected DOM wrappers and watch iframe loading
  useEffect(() => {
    const el = ref.current;
    if (!el || !queued || isBlocked) return;

    const stripWhite = () => {
      el.querySelectorAll("*").forEach((node) => {
        const elem = node as HTMLElement;
        if (elem.style) {
          elem.style.backgroundColor = "transparent";
          elem.style.background = "transparent";
          if (elem.tagName === "IFRAME") {
            elem.style.colorScheme = "dark";
            elem.style.border = "none";
          }
          if (elem.classList.contains("getty") || elem.classList.contains("embed")) {
            elem.style.backgroundColor = "transparent";
            elem.style.background = "transparent";
            elem.style.maxWidth = "594px";
            elem.style.margin = "0 auto";
          }
        }
      });
    };

    const attachIframeEvents = () => {
      const iframe = el.querySelector("iframe");
      if (iframe) {
        stripWhite();
        try {
          if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
            setLoaded(true);
          }
        } catch {
          // Cross-origin iframe access restricted, indicating the iframe has begun loading or loaded
          setLoaded(true);
        }
        iframe.onload = () => {
          stripWhite();
          setLoaded(true);
        };
        iframe.onerror = () => {
          onFailRef.current();
        };
      }
      const imgs = el.querySelectorAll("img");
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth === 0) {
          onFailRef.current();
        }
        img.onerror = () => {
          onFailRef.current();
        };
        img.onload = () => {
          stripWhite();
          setLoaded(true);
        };
      });
    };

    attachIframeEvents();

    const mo = new MutationObserver(() => {
      stripWhite();
      attachIframeEvents();
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [queued, isBlocked]);

  // Handle reload on significant width resize
  useEffect(() => {
    const el = ref.current;
    if (!el || !loaded) return;
    let loadedWidth = el.getBoundingClientRect().width;
    let timer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const width = el.getBoundingClientRect().width;
        const iframe = el.querySelector("iframe");
        if (!iframe || Math.abs(width - loadedWidth) < 8) return;
        loadedWidth = width;
        const src = iframe.src;
        iframe.src = "about:blank";
        window.setTimeout(() => (iframe.src = src), 50);
      }, 250);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [loaded]);

  // A single failed asset falls back gracefully after 8 seconds
  useEffect(() => {
    if (!queued || isBlocked) return;
    const t = window.setTimeout(() => {
      if (!ref.current?.querySelector("iframe") && !ref.current?.querySelector("img")) {
        onFailRef.current();
      } else if (!loaded) {
        onFailRef.current();
      }
    }, 8000);
    return () => window.clearTimeout(t);
  }, [queued, isBlocked, loaded]);

  const wNum = parseInt(params.w, 10) || 594;
  const hNum = parseInt(params.h, 10) || 396;

  return (
    <div
      className={`getty-embed-wrapper editorial-getty-embed relative mx-auto ${
        fit
          ? "w-full h-full"
          : "w-full max-w-[594px] rounded-xl overflow-hidden bg-[#08131F]"
      }`}
      style={naturalHeight ? { maxWidth: `${wNum}px`, width: "100%" } : fit ? { width: "100%", height: "100%" } : { maxWidth: `${wNum}px`, width: "100%", aspectRatio: `${wNum} / ${hNum}` }}
    >
      <div ref={ref} className="w-full" />
      {!loaded && (
        <div className="absolute inset-0 min-h-[220px] flex items-center justify-center bg-[#08131F] pointer-events-none transition-opacity duration-300">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function LicensedImage({ img, eager, onFail }: { img: EditorialImage; eager: boolean; onFail: () => void }) {
  return (
    <div className="w-full aspect-video overflow-hidden rounded-xl bg-[#0A0F1D] relative">
      <img
        src={img.licensedImageUrl}
        alt={img.altText}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        onError={onFail}
        className="w-full h-full object-cover transition-transform duration-500 ease-out hover:scale-[1.02]"
        style={{ objectPosition: (img as any).objectPosition || "center" }}
      />
    </div>
  );
}

interface EditorialImageFigureProps {
  image: EditorialImage;
  /** "card": compact cover on Dugout listing cards — no margins, no caption block (Getty's viewer carries the credit). */
  variant?: "hero" | "inline" | "card";
  /** Admin preview only: render a record that is not yet publishable. */
  allowUnpublished?: boolean;
  className?: string;
  /** Shown instead when the photo may not render here (commercial zone, no embed consent, failure). */
  fallback?: React.ReactNode;
}

/**
 * One editorial photograph with its caption and credit. Re-checks the rights
 * gate itself, so a pending or malformed record renders nothing even if a
 * caller passes it in by mistake.
 */
export function EditorialImageFigure({ image, variant = "inline", allowUnpublished = false, className = "", fallback = null }: EditorialImageFigureProps) {
  const [failed, setFailed] = useState(false);
  const isBlocked = useGettyBlocked();
  useEffect(() => setFailed(false), [image.embedHtml, image.licensedImageUrl]);
  // A licensed file is self-hosted; only a record without one is shown through Getty's viewer.
  const embed = !image.licensedImageUrl && (image.rightsStatus === "approved-embed" || image.source === "getty") ? parseGettyEmbed(image.embedHtml) : null;
  const allowed = usePhotoAllowed(image, Boolean(embed));
  const embedConsent = useEmbedConsent();
  const commercialZone = useCommercialZone();

  if (embed && !commercialZone && embedConsent !== "granted") {
    if (fallback) return <>{fallback}</>;
    return <div className="p-5 text-center text-sm text-slate-300"><p>Getty photo is mapped. Enable embedded content to view it.</p><button type="button" onClick={grantEmbedConsent} className="mt-3 rounded-lg border border-amber-400/50 px-4 py-2 text-amber-200">Load Getty photograph</button><a href={image.sourcePageUrl} target="_blank" rel="noreferrer" className="mt-3 block text-xs underline">View on Getty Images ↗</a></div>;
  }
  if (failed || (embed && isBlocked)) {
    if (fallback) return <>{fallback}</>;
    return <div className="p-5 text-center text-sm text-slate-300"><p>Getty’s viewer could not load this mapped photograph.</p><a href={image.sourcePageUrl} target="_blank" rel="noreferrer" className="mt-3 block underline">View photograph on Getty Images ↗</a></div>;
  }
  if (!allowed) return <>{fallback}</>;
  if (!isPublishable(image) && !((allowUnpublished || import.meta.env.DEV) && isLocalPreviewable(image))) return <>{fallback}</>;
  if (!embed && !image.licensedImageUrl) return <>{fallback}</>;
  const onFail = () => setFailed(true);

  return (
    <figure
      data-editorial-photo={image.sectionId}
      className={`relative isolate w-full ${variant === "card" ? "" : "my-1"} ${className}`}
    >
      <div className="w-full relative flex flex-col items-center justify-center">
        {fallback && <div className="absolute inset-0 w-full h-full pointer-events-none z-0">{fallback}</div>}
        {embed ? (
          <div className="relative z-10 w-full max-w-[594px] mx-auto">
            <GettyEmbed key={`${embed.items}-${embed.id}`} params={embed} onFail={onFail} />
          </div>
        ) : (
          <LicensedImage key={image.licensedImageUrl} img={image} eager={variant === "hero"} onFail={onFail} />
        )}
      </div>
      {variant !== "card" && (
      <figcaption className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[#8A9EA8] border-l-2 border-[#2A4050] pl-3 max-w-[594px] mx-auto w-full">
        <span className="text-[#EFF5F7]">
          {image.caption.replace(/^TOPSHOT - /, "").replace(/^[A-Z][A-Z ,.'-]+? ?- ?[A-Z]+ \d{1,2}: /, "")}
        </span>
        {image.photographerCredit && (
          <span className="block mt-0.5 text-[11px] font-mono uppercase tracking-wide text-[#8A9EA8]">
            {image.photographerCredit}
            {embed && !/getty/i.test(image.photographerCredit) && " / Getty Images"}
          </span>
        )}
      </figcaption>
      )}
    </figure>
  );
}

const MEDIA_ASPECT = { video: "aspect-video", cinema: "aspect-[21/9]", classic: "aspect-[4/3]" } as const;

/**
 * Card media frame for Dugout listings: a fixed-ratio dark frame so every card has the same shape.
 * - Licensed / CricField-hosted files fill the frame (object-cover) with a bottom fade and a small credit badge.
 * - Getty Embedded Viewer photos fit full frame inside the card.
 */
export function EditorialCardMedia({
  image,
  aspect = "video",
  allowUnpublished = false,
  className = "",
  fallback = null,
  preserveAspectRatio = false,
}: {
  image: EditorialImage;
  aspect?: keyof typeof MEDIA_ASPECT;
  allowUnpublished?: boolean;
  className?: string;
  /** Shown instead when the photo may not render here (commercial zone, no embed consent, failure). */
  fallback?: React.ReactNode;
  /** Keep the complete Getty viewer, including its attribution, in normal document flow. */
  preserveAspectRatio?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const isBlocked = useGettyBlocked();
  useEffect(() => setFailed(false), [image.embedHtml, image.licensedImageUrl]);
  const embed = (image.source === "getty" || image.rightsStatus === "approved-embed") && !image.licensedImageUrl ? parseGettyEmbed(image.embedHtml) : null;
  const allowed = usePhotoAllowed(image, Boolean(embed));
  const embedConsent = useEmbedConsent();
  const commercialZone = useCommercialZone();

  if (embed && !commercialZone && embedConsent !== "granted") {
    if (fallback) return <>{fallback}</>;
    return <div className="p-5 text-center text-sm text-slate-300"><p>Getty photo is mapped. Enable embedded content to view it.</p><button type="button" onClick={grantEmbedConsent} className="mt-3 rounded-lg border border-amber-400/50 px-4 py-2 text-amber-200">Load Getty photograph</button><a href={image.sourcePageUrl} target="_blank" rel="noreferrer" className="mt-3 block text-xs underline">View on Getty Images ↗</a></div>;
  }
  if (failed || (embed && isBlocked)) {
    if (fallback) return <>{fallback}</>;
    return <div className="p-5 text-center text-sm text-slate-300"><p>Getty’s viewer could not load this mapped photograph.</p><a href={image.sourcePageUrl} target="_blank" rel="noreferrer" className="mt-3 block underline">View photograph on Getty Images ↗</a></div>;
  }
  if (!allowed) return <>{fallback}</>;
  if (!isPublishable(image) && !((allowUnpublished || import.meta.env.DEV) && isLocalPreviewable(image))) return <>{fallback}</>;
  if (!embed && !image.licensedImageUrl) return <>{fallback}</>;
  const onFail = () => setFailed(true);

  return (
    <div
      data-editorial-photo={image.sectionId}
      className={`relative ${embed && preserveAspectRatio ? "" : MEDIA_ASPECT[aspect]} w-full overflow-hidden bg-[#0b1220] ${className}`}
    >
      {/* Background artwork rendered as a base underneath so the container is NEVER blank */}
      {fallback && <div className="absolute inset-0 w-full h-full pointer-events-none z-0">{fallback}</div>}

      {embed ? (
        <div className={preserveAspectRatio ? "relative w-full z-10" : "absolute inset-0 w-full h-full z-10"}>
          <GettyEmbed key={`${embed.items}-${embed.id}`} params={embed} onFail={onFail} fit={!preserveAspectRatio} naturalHeight={preserveAspectRatio} />
        </div>
      ) : (
        <>
          <img
            src={image.licensedImageUrl}
            alt={image.altText}
            loading="lazy"
            decoding="async"
            onError={onFail}
            className={`absolute inset-0 h-full w-full z-10 ${preserveAspectRatio ? "object-contain" : "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"}`}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(15,23,42,0.9)] via-[rgba(15,23,42,0.15)] to-transparent z-20" />
          {image.photographerCredit && (
            <span className="absolute bottom-2 right-2.5 text-[10px] leading-none text-slate-300/70 z-30">
              {image.photographerCredit.replace(/^Photo by /, "")}
            </span>
          )}
        </>
      )}
    </div>
  );
}
