import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { normalizeSiteOrigin, pageMetadata, SITE_ORIGIN } from '@/lib/site-seo';

/** Client navigation metadata only; social crawlers still need prerendered HTML. */
export function RouteMetadata() {
  const [location] = useLocation();
  useEffect(() => {
    // The article renderer owns its specific metadata and restores it on unmount.
    if (/^\/(dugout\/)?articles\//.test(location)) return;
    const path = location.split('?')[0].replace(/\/+$/, '') || '/';
    const metadata = pageMetadata(path);
    const title = `${metadata.title} | CricField`;
    const previousTitle = document.title;
    const added: Element[] = [];
    const previous = new Map<Element, string | null>();
    const meta = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (element) previous.set(element, element.getAttribute('content'));
      else {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
        added.push(element);
      }
      element.setAttribute('content', content);
    };
    document.title = title;
    meta('name', 'description', metadata.description);
    meta('property', 'og:title', title);
    meta('property', 'og:description', metadata.description);
    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', 'CricField');
    meta('name', 'twitter:card', 'summary_large_image');
    meta('property', 'og:image', `${SITE_ORIGIN}/branding/cricfield-banner-default.png`);
    meta('name', 'twitter:image', `${SITE_ORIGIN}/branding/cricfield-banner-default.png`);
    meta('name', 'twitter:title', title);
    meta('name', 'twitter:description', metadata.description);
    if (/^\/(admin(?:\/|$)|photo-pipeline(?:\/|$))/.test(path)) meta('name', 'robots', 'noindex, nofollow');
    const origin = normalizeSiteOrigin(import.meta.env.VITE_SITE_ORIGIN) ?? SITE_ORIGIN;
    if (origin) {
      const url = `${origin}${path === '/' ? '/home' : path}`;
      const existingCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      const previousHref = existingCanonical?.getAttribute('href');
      const canonical = existingCanonical ?? document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = url;
      document.head.appendChild(canonical);
      if (!existingCanonical) added.push(canonical);
      else previous.set(canonical, previousHref ?? null);
      meta('property', 'og:url', url);
    }
    return () => {
      document.title = previousTitle;
      added.forEach(element => element.remove());
      previous.forEach((value, element) => {
        const attribute = element.tagName === 'LINK' ? 'href' : 'content';
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      });
    };
  }, [location]);
  return null;
}
