# 20 — UI Design Audit

> **Evidence:** live screenshots at 1440×900 and 375×812 (2026-10-12), computed contrast ratios (WCAG 2.x relative-luminance formula), and code-wide counts of design tokens/classes in `artifacts/ipl-analytics/src`. There are **no Figma files, style guides or design-token documents in the repository**; everything here is reverse-engineered from the implementation.

---

## 1. Visual identity (as implemented)

| Element | What the code does | Evidence |
|---|---|---|
| Mood | Dark “broadcast / sci-fi console” look: near-black navy background, glassy cards, neon violet/cyan accents, large uppercase display type, motion | `index.css:5-30`, screenshots |
| Base palette | `--background hsl(228 60% 5%)`, `--card hsl(226 48% 9%)`, `--primary/--accent hsl(263 83% 58%)` (violet), `--muted-foreground hsl(215 20% 65%)` | `index.css` |
| Team palette | runtime `--team-accent`, `--team-secondary`, `--team-glow`, `--team-surface-tint` per franchise | `lib/team-context.tsx`, `lib/team-palette.ts` |
| Radius | `--radius: 16px`; in practice `rounded-xl` (588), `rounded-full` (429), `rounded-2xl` (316), plus arbitrary `rounded-[24px]`/`[28px]`/`[20px]` | class counts |
| Light mode | none (8 `dark:` variants in the whole app; theme is dark-only) | count |
| Brand names on screen | “IPL Decision Intelligence OS” (title/meta), “IPL 2026 Intelligence OS” (logo lock-up), “Beyond XI” (fan arena), “CricField Scout Lab”, “Gully AI” (mascot) | `site-profile.ts`, `index.html`, `scout-home.tsx` |

**Assessment:** the visual direction is distinctive and consistent in *mood*, and team theming is a genuinely good product idea. The identity is fragmented in *naming*: five product names, and “CricField” appears only inside Scout Lab. A reviewer cannot tell what the product is called.

---

## 2. Typography

| Finding | Evidence | Impact |
|---|---|---|
| Declared body font **“Outfit” is never loaded** (no `@font-face` or Google Fonts link); the page falls back to the system UI font unless the visitor has Outfit installed | `index.css:43`; `index.html:14` loads Inter + JetBrains Mono only | Typography differs by device; Inter is downloaded but not applied to body text |
| Type scale is ad hoc: arbitrary pixel sizes dominate — `text-[10px]` ×785, `[9px]` ×475, `[11px]` ×345, `[8px]` ×236, `[7px]` ×62; standard steps (`text-sm`, `text-base`) are rare | class counts | No modular scale; hard to keep consistent |
| **1,558 class usages set text at 7–10 px** (785 + 475 + 236 + 62) | counts above; 69 such elements rendered on `/stats` at 375 px | Below comfortable reading size (~12 px minimum for UI labels; 16 px body); fails users with low vision |
| Heavy weights everywhere: `font-black` ×1,336, `font-bold` ×947 | counts | Weight no longer signals hierarchy when almost everything is black/bold |
| `uppercase` ×1,327 with `tracking-widest` ×450 | counts | Uppercase micro-labels are hard to scan; screen readers may spell some out |
| Display headings very large (“ADVANCED STATS.” hero) | screenshot | Strong brand moment on desktop; **clipped at 375 px** (“AD / STA”) |

---

## 3. Colour and contrast (computed)

Text opacity on the two main surfaces (WCAG AA needs **4.5:1** for normal text, 3:1 for large text ≥ 18.66 px bold / 24 px):

| Text style | Uses in code | On `--background` | On `#0B1020` cards | AA normal text? |
|---|---:|---:|---:|---|
| `text-white` | — | 19.95 | 18.93 | ✅ |
| `text-white/80` | 102 | 12.64 | 12.18 | ✅ |
| `text-white/60` | 212 | 7.30 | 7.19 | ✅ |
| `text-white/50` | 180 | 5.31 | 5.31 | ✅ |
| **`text-white/40`** | **609** | **3.75** | **3.81** | ❌ |
| **`text-white/30`** | **200** | **2.57** | **2.65** | ❌ |
| `text-white/25` | 22 | 2.12 | 2.20 | ❌ |
| `text-white/20` | 84 | (lower) | (lower) | ❌ |
| `--muted-foreground` | — | 7.76 | — | ✅ |
| violet `#8B5CF6` on background | — | 4.71 | — | ✅ (barely) |

**Roughly 900 class usages fall below AA**, and most are the same tiny uppercase labels from §2 — the worst combination (small + low contrast). The shadcn token `--muted-foreground` passes comfortably; replacing `text-white/30–40` with it would fix most cases at once.

---

## 4. Spacing, grids and layout

| Aspect | Observation |
|---|---|
| Shell | three-column frame: 56 px icon rail (left), content, collapsible “Intelligence Feed” rail (right) | 
| Grids | Tailwind grids (`grid-cols-1 lg:grid-cols-2`, `sm:grid-cols-10`); breakpoint usage uneven: `player.tsx` 92 breakpoint classes, `dugout.tsx` 1, `home.tsx` 5 |
| Density | Scout and War Room tables are information-dense (8–10 columns) — appropriate for analysts, overwhelming for fans |
| Hero sections | `/stats`, `/home`, `/dugout` open with full-viewport heroes; on `/stats` the first table is entirely below the fold at 1440×900 |
| Overlays | cookie banner + “Gully AI” mascot + quick-tour card + right rail compete for the bottom-right corner; at 375 px they cover a large share of the screen |
| Empty regions | `/dugout/csk` shows a large empty band between tabs and content at 1440 px |

---

## 5. Components and consistency

| Area | Finding |
|---|---|
| Primitive library | ~50 shadcn/Radix primitives in `components/ui/*` give accessible dialogs, menus, tabs, tooltips |
| Feature components | Many bespoke cards (`glass-card`, `kpi-card`, `hero-focus-card`, `fixture-ticket-card`, module-shell `Tile`) with overlapping roles |
| Decision modules | **Most consistent area**: shared `module-shell.tsx` (header, picker, segmented control, Demo/Error banners, diverging colour tokens) |
| Tokens vs hard-coding | Semantic Tailwind classes (`bg-primary`) don’t resolve because the Tailwind v4 `@theme` mapping is missing, so pages hard-code hex values (`fan-arena.tsx` 223 hex literals; `player.tsx` 64; `stats.tsx` 73) |
| Icons | lucide-react + react-icons; nav uses **icons without visible labels** on desktop |

---

## 6. Accessibility audit (heuristic, not a formal WCAG audit)

| Check | Result | Evidence |
|---|---|---|
| Pinch-zoom | ❌ disabled by `maximum-scale=1` | `index.html:5` |
| Contrast | ❌ ~900 sub-AA class usages | §3 |
| Text size | ❌ 1,558 class usages ≤ 10 px | §2 |
| Accessible names | ❌ 8 of 32 buttons on `/home` have no name; most large pages have **0** `aria-*` attributes (`stats.tsx`, `player.tsx`, `home.tsx`, `fan-arena.tsx`) | in-browser query + code scan |
| Images | ✅ the 9 images on `/home` all have `alt` | in-browser |
| Headings | `/home` has one `h1` | in-browser |
| Keyboard / focus | Radix primitives handle focus in dialogs/menus; custom clickable `div`s and icon buttons not verified | ❔ needs a keyboard pass |
| Reduced motion | `index.css` contains a `prefers-reduced-motion` rule | grep |
| Colour-only meaning | BUY/HOLD/AVOID chips and diverging heatmaps rely on colour plus text labels (good) | War Room, Weakness pages |

**Formal status:** no axe/Lighthouse report, no screen-reader test and no keyboard-only test exist. Do not claim the site is accessible.

---

## 7. What is genuinely strong

1. **Uncertainty is visible**: Scout rows show tier, balls, interval and percentile beside the score.
2. **Honest empty and demo states** in Decision modules (“showing a saved scan … start the api-server”).
3. **Methodology and Data Sources pages** exist and credit Cricsheet.
4. **Team theming via CSS variables** — cheap, global, delightful.
5. Ask page “READ AS” chips make the system’s interpretation inspectable and editable.

---

## 8. Priority fixes (design debt)

| Priority | Fix |
|---|---|
| P0 | Remove `maximum-scale=1`; raise all text to ≥ 12 px; replace `text-white/30–40` with `text-muted-foreground` |
| P0 | Load the font you declare (or declare Inter) |
| P1 | One product name; demote sub-brands to section names |
| P1 | A type scale (e.g., 12/14/16/20/24/32/48) and spacing scale as tokens; add the Tailwind `@theme` mapping so semantic classes work |
| P1 | Move primary tasks above the fold on `/stats`; collapse heroes on return visits |
| P2 | Consolidate card components; label icon-only navigation; mobile layout for wide tables (card view) |
