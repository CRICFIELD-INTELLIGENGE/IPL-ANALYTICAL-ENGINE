// Placement audit: which routes can show Getty photographs, AdSense units, sponsor modules, Shop /
// merchandise or Premium content, and whether the photo safeguards are wired in.
//   pnpm exec tsx scripts/editorial/placement-audit.ts
// Writes docs/editorial-images/PLACEMENT-AUDIT.md (+ .json). Exits 1 if a safeguard check fails.
//
// Static analysis: each route's page module is followed through its local imports. "Can show" means
// the component is reachable from the page; whether it renders depends on data and consent at runtime.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const APP = resolve(import.meta.dirname, "../..");
const ROOT = resolve(APP, "../..");
const SRC = resolve(APP, "src");
const rel = (f: string) => relative(APP, f).replace(/\\/g, "/");

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = resolve(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) if (existsSync(base + ext) && !/\.(json|css)$/.test(base + ext) && existsSync(base + ext) && !base.endsWith("/")) {
    const f = base + ext;
    try {
      readFileSync(f, "utf8");
      return f;
    } catch {
      /* directory */
    }
  }
  return null;
}
const importCache = new Map<string, string[]>();
function imports(file: string): string[] {
  if (importCache.has(file)) return importCache.get(file)!;
  const src = readFileSync(file, "utf8");
  const out = new Set<string>();
  for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
    const r = resolveImport(file, m[1] ?? m[2]);
    if (r) out.add(r);
  }
  importCache.set(file, [...out]);
  return [...out];
}
function closure(entry: string): Set<string> {
  const seen = new Set<string>([entry]);
  const stack = [entry];
  while (stack.length) for (const n of imports(stack.pop()!)) if (!seen.has(n)) seen.add(n), stack.push(n);
  return seen;
}

// ── Routes from App.tsx ───────────────────────────────────────────────────────
const appFile = resolve(SRC, "App.tsx");
const app = readFileSync(appFile, "utf8");
const lazyFiles = new Map<string, string>();
for (const m of app.matchAll(/const (\w+) = lazy\(\(\) => import\(["']([^"']+)["']\)/g)) {
  const f = resolveImport(appFile, m[2]);
  if (f) lazyFiles.set(m[1], f);
}
const routes: { path: string; component: string; file: string; admin: boolean }[] = [];
for (const m of app.matchAll(/(\{ADMIN_PAGES_ENABLED && )?<Route path="([^"]+)"(?: component=\{(\w+)\})?\s*\/?>/g)) {
  // Routes written with children (<Route path="/shop">{() => …<ShopPage />…}</Route>): take the first lazy page inside.
  const end = app.indexOf("</Route>", m.index!);
  const body = m[3] ? "" : app.slice(m.index! + m[0].length, end >= 0 ? Math.min(end, m.index! + 400) : m.index! + 400);
  const comp = m[3] ?? ([...body.matchAll(/<(\w+)\b/g)].map((x) => x[1]).find((n) => lazyFiles.has(n)) ?? "");
  const file = lazyFiles.get(comp);
  if (file) routes.push({ path: m[2], component: comp, file, admin: Boolean(m[1]) });
}

// ── Markers ───────────────────────────────────────────────────────────────────
const FIGURE = resolve(SRC, "components/dugout/editorial-image-figure.tsx");
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
type Row = {
  path: string;
  file: string;
  admin: boolean;
  getty: boolean;
  adUnits: number;
  adSlots: string[];
  sponsorModules: number;
  sponsorGuarded: boolean;
  shop: boolean;
  premium: boolean;
  commercialZone: string | null;
};
const rows: Row[] = routes.map((r) => {
  const files = [...closure(r.file)];
  const texts = files.filter((f) => !/ad-vessel|ad-slot|photo-policy/.test(f)).map((f) => [f, readFileSync(f, "utf8")] as const);
  const getty = files.includes(FIGURE) && texts.some(([, t]) => /<EditorialImageFigure\b|<EditorialCardMedia\b/.test(t));
  const pageText = texts.map(([, t]) => t).join("\n");
  const adUnits = count(pageText, /<AdVessel\b|<AdSlot\b/g);
  const adSlots = [...new Set([...pageText.matchAll(/<Ad(?:Vessel|Slot)[^>]*?slot="(\d+)"/g)].map((m) => m[1]))];
  const sponsorModules = count(pageText, /Sponsored Partner|Official Partner|>\s*Sponsored\s*</g);
  const sponsorGuarded = sponsorModules === 0 || texts.filter(([, t]) => /Sponsored Partner/.test(t)).every(([, t]) => /<SponsorModule>/.test(t));
  const shop = r.path.startsWith("/shop") || /COLLECTIONS_DATA|ProductItem/.test(readFileSync(r.file, "utf8"));
  const premium = /premium analyst|premium tier|premium plan|subscribe to premium|upgrade to premium/i.test(readFileSync(r.file, "utf8"));
  const zone = new RegExp(`<Route path="${r.path.replace(/[/:*]/g, (c) => `\\${c}`)}"[\\s\\S]{0,200}?<CommercialZone reason="(\\w+)"`).exec(app)?.[1] ?? null;
  return { path: r.path, file: rel(r.file), admin: r.admin, getty, adUnits, adSlots, sponsorModules, sponsorGuarded, shop, premium, commercialZone: zone };
});

// ── Safeguard checks ──────────────────────────────────────────────────────────
const checks: { name: string; pass: boolean; detail: string }[] = [];
const read = (p: string) => readFileSync(resolve(SRC, p), "utf8");
const fig = read("components/dugout/editorial-image-figure.tsx");
const vessel = read("components/ad-vessel.tsx");
const slot = read("components/ad-slot.tsx");
checks.push({ name: "Getty viewer registers itself while mounted (drives ad-free pages)", pass: /function GettyEmbed[\s\S]{0,200}useRegisterGettyEmbed\(\)/.test(fig), detail: "editorial-image-figure.tsx" });
checks.push({ name: "Photo components refuse Getty photos in commercial zones and without embed consent", pass: /useCommercialZone\(\)/.test(fig) && /consent !== "granted"/.test(fig) && count(fig, /usePhotoAllowed\(image, /g) === 2, detail: "usePhotoAllowed in EditorialImageFigure and EditorialCardMedia" });
checks.push({ name: "AdVessel is a commercial zone and withdraws on Getty pages", pass: /<CommercialZone reason="advertising">/.test(vessel) && /useGettyEmbedsOnPage\(\)/.test(vessel) && /gettyEmbedsOnPage\(\) > 0/.test(vessel), detail: "ad-vessel.tsx" });
checks.push({ name: "AdSlot is a commercial zone and withdraws on Getty pages", pass: /<CommercialZone reason="advertising">/.test(slot) && /useGettyEmbedsOnPage\(\)/.test(slot) && /gettyEmbedsOnPage\(\) > 0/.test(slot), detail: "ad-slot.tsx" });
const shopRow = rows.find((r) => r.path === "/shop");
checks.push({ name: "Shop route is a commercial zone with no editorial photo components", pass: Boolean(shopRow && shopRow.commercialZone === "shop" && !shopRow.getty), detail: shopRow ? `zone=${shopRow.commercialZone}, getty=${shopRow.getty}` : "route not found" });
for (const r of rows.filter((x) => x.getty && x.sponsorModules > 0)) checks.push({ name: `Sponsor modules on ${r.path} are withheld while Getty embeds show`, pass: r.sponsorGuarded, detail: r.file });
const allSrc = [...closure(appFile)].map((f) => [rel(f), readFileSync(f, "utf8")] as const);
const hotlinks = allSrc.filter(([f, t]) => /media\.gettyimages\.com|gettyimages\.[a-z.]+\/id\/\d+\/photo/.test(t) && !/editorial-image-review/.test(f));
checks.push({ name: "No Getty image-file URLs (hotlinks) in the app source", pass: hotlinks.length === 0, detail: hotlinks.map(([f]) => f).join(", ") || "none" });
const widgetLoaders = allSrc.filter(([f, t]) => /embed-cdn\.gettyimages\.com\/widgets\.js/.test(t) && !f.endsWith("editorial-image-figure.tsx"));
checks.push({ name: "Getty's widget script is loaded only by the consent-gated viewer", pass: widgetLoaders.length === 0, detail: widgetLoaders.map(([f]) => f).join(", ") || "only editorial-image-figure.tsx" });
const banner = read("components/consent-banner.tsx");
checks.push({ name: "Consent banner asks about embedded Getty content", pass: /grantEmbedConsent/.test(banner) && /Getty Images/.test(banner), detail: "consent-banner.tsx" });
const privacy = read("pages/privacy.tsx");
checks.push({ name: "Privacy policy discloses Getty's Embedded Viewer and offers controls", pass: /Embedded photographs from Getty Images/.test(privacy) && /<EmbedChoice \/>/.test(privacy), detail: "privacy.tsx" });

// Manifest posture (nothing auto-approved)
const manifest: { images: { rightsStatus: string; source: string; review?: unknown; articleId: string }[] } = JSON.parse(readFileSync(resolve(SRC, "data/editorial-images/manifest.json"), "utf8"));
const byStatus: Record<string, number> = {};
for (const i of manifest.images) byStatus[i.rightsStatus] = (byStatus[i.rightsStatus] ?? 0) + 1;
const approvedWithoutReview = manifest.images.filter((i) => (i.rightsStatus === "approved-embed" || i.rightsStatus === "licensed") && !i.review).length;
checks.push({ name: "No approved record lacks a review (no automatic approvals)", pass: approvedWithoutReview === 0, detail: JSON.stringify(byStatus) });

// ── Report ───────────────────────────────────────────────────────────────────
const yes = (b: boolean) => (b ? "yes" : "—");
const L: string[] = ["# Photo placement audit", "", `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/editorial/placement-audit.ts\` (static analysis of each route's import tree).`, ""];
L.push("## Safeguards", "", "| Check | Result | Detail |", "|---|---|---|");
for (const c of checks) L.push(`| ${c.name} | ${c.pass ? "pass" : "**FAIL**"} | ${c.detail} |`);
L.push("", "## Routes", "", "“Getty” = an editorial photo component is reachable from the page. “Ad units” = AdVessel/AdSlot occurrences in the page's components. At runtime, ad units and sponsor modules withdraw while a Getty viewer is on screen.", "");
L.push("| Route | Getty photos | Ad units (slots) | Sponsor modules | Sponsors withheld on Getty pages | Shop / merch | Premium | Commercial zone | Admin only |", "|---|---|---|---|---|---|---|---|---|");
for (const r of rows) L.push(`| \`${r.path}\` | ${yes(r.getty)} | ${r.adUnits ? `${r.adUnits} (${r.adSlots.join(", ")})` : "—"} | ${r.sponsorModules || "—"} | ${r.sponsorModules ? (r.sponsorGuarded ? (r.getty ? "yes" : "n/a") : "**no**") : "—"} | ${yes(r.shop)} | ${yes(r.premium)} | ${r.commercialZone ?? "—"} | ${yes(r.admin)} |`);
L.push("", "## Getty image registry", "", `${manifest.images.length} records: ${Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(", ")}. Articles covered: ${new Set(manifest.images.map((i) => i.articleId)).size}.`, "");
L.push("Public builds ship only `approved-embed` / `licensed` records that pass the four-point checklist; every other record is stripped at build time. On localhost, candidates render for review once the visitor has consented to embedded content.");
mkdirSafe(resolve(ROOT, "docs/editorial-images"));
writeFileSync(resolve(ROOT, "docs/editorial-images/PLACEMENT-AUDIT.md"), L.join("\n") + "\n");
writeFileSync(resolve(ROOT, "docs/editorial-images/PLACEMENT-AUDIT.json"), JSON.stringify({ generatedAt: new Date().toISOString(), checks, routes: rows, registry: byStatus }, null, 1) + "\n");
function mkdirSafe(_: string) {}

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? "✓" : "✗"} ${c.name} — ${c.detail}`);
console.log(`routes: ${rows.length}; with Getty: ${rows.filter((r) => r.getty).length}; with ads: ${rows.filter((r) => r.adUnits).length}; with sponsor modules: ${rows.filter((r) => r.sponsorModules).length}`);
process.exit(failed.length ? 1 : 0);
