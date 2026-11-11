# CricField cinematic trophy login

Implemented the latest supplied desktop brief on `/account`. The original application is a Vite React SPA with Wouter and Supabase; that architecture, singleton auth client, stored sessions and application routes remain in place. No new authentication provider or framework was introduced.

## Delivered experience

- Generated sunset stadium artwork, original React SVG logo at upper left, handwritten headline, two restrained notes, crown doodle and sparse golden motes.
- A large, blank gold trophy asset is the decorative shell around real HTML inputs, buttons, validation and links. There is no rectangular outer authentication card and no baked-in form screenshot.
- The form stays inside the trophy's dark central face. Handles, rim and ribbons sit outside the interactive fields. Pedestal navigation uses the existing `/scores`, `/scout`, `/dugout` and `/stats` routes.
- Default pairing is **CSK versus RCB**, as the latest brief requests. Selected team colors drive the logo, first ball, first ribbon and primary CTA. The second ball and ribbon use the configured rival. CSK → RCB, RCB → CSK and MI → CSK are explicit; other teams use the existing registry's `archRival` as the documented fallback.
- “One Game.” and the active Sign In segment use warm gold, following the latest reference. The primary CTA uses the selected franchise color with contrasting text and a restrained highlight.
- Auth mascots use six consistent rendered facial poses, layered over franchise colors with raised stitching, leather detail and rim lighting. Both display team names directly on the balls. No crest stickers are attached to the balls.
- A gentle 12-second grounded loop combines facial reactions, small rolls and bounces, measured trophy-base contact, contact shadows and stylized challenge/friendly hand gestures. There is no distracting continuous idle spin in the final desktop design.
- Form focus and typing take priority over rivalry. Pending authentication moves the same selected mascot into the trophy display, spins it while the real request is pending, then returns it. A confirmed session celebrates and goes to My Dugout, or a previously recorded safe internal destination.
- Password login, signup and confirmation, password visibility, recovery, magic links and configured OAuth providers retain real Supabase behavior. Failed login preserves the email. Existing profile, notifications, saved features, workspace and sign-out are retained.
- Visibility pause, reduced-motion behavior, keyboard tab navigation, form labels, field validation and focus indicators are included.

## Desktop fit

The scene uses uniform scaling with adaptive stage dimensions. Artwork and round mascots are not stretched, and the signed-out page fills the viewport without page scrolling. Verified desktop targets are **1280 × 800**, **1440 × 900** and **1920 × 1080**. The final pass focuses on desktop; the previously implemented compact layout was retained rather than redesigned again.

## Verification

- Latest-reference browser suite: **12 passed**, including all three desktop sizes, password interactions, pending/error travel, recovery, RCB/CSK/MI theme links, full-viewport fit, card-free form styling, and trophy/form/ribbon geometry.
- Final trophy-destination checks: **2 passed**. The pending mascot arrives at the measured trophy display destination; failure restores the ball and preserves the entered email.
- Frontend TypeScript: **passed**.
- Production build: **passed** (final delivery build, 1m 50s).
- Authentication browser tests intercept all Supabase calls. No live account was created, no email was sent, and no real provider login was completed. Real email delivery and identity-provider credentials are not established by these client tests.
- Existing source-map warnings and the large-bundle advisory are noted; they have not prevented prior production builds.

From `artifacts/ipl-analytics`, with the local site running:

```text
pnpm exec playwright test --config e2e/desktop-auth.config.ts
pnpm typecheck
pnpm build
```

## Modified files

Repository-relative paths:

| File | Role |
| --- | --- |
| `artifacts/ipl-analytics/src/pages/account.tsx` | Account route entry |
| `artifacts/ipl-analytics/src/components/desktop-auth/DesktopAccount.tsx` | Live form, providers, interactions, local scene header and pedestal links |
| `artifacts/ipl-analytics/src/components/desktop-auth/RivalryArena.tsx` | Rivalry, rendered expressions, grounded contact, hand gestures and auth travel |
| `artifacts/ipl-analytics/src/components/desktop-auth/TrophyFrame.tsx` | Blank trophy artwork and team ribbons |
| `artifacts/ipl-analytics/src/components/desktop-auth/StadiumAtmosphere.tsx` | Sparse decorative motes |
| `artifacts/ipl-analytics/src/components/desktop-auth/auth-palette.ts` | Shared color resolution and explicit rival mapping |
| `artifacts/ipl-analytics/src/components/desktop-auth/use-auth-stage.ts` | Viewport-fit stage dimensions |
| `artifacts/ipl-analytics/src/components/desktop-auth/use-desktop-auth.ts` | Supabase session/auth operations and safe post-auth destination |
| `artifacts/ipl-analytics/src/components/desktop-auth/DesktopAccountProfile.tsx` | Preserved private account tools |
| `artifacts/ipl-analytics/src/components/desktop-auth/desktop-auth.css` | Base account presentation |
| `artifacts/ipl-analytics/src/components/desktop-auth/trophy-experience.css` | Shared stadium/trophy treatment |
| `artifacts/ipl-analytics/src/components/desktop-auth/centered-trophy.css` | Shared layered artwork composition |
| `artifacts/ipl-analytics/src/components/desktop-auth/auth-static-stage.css` | Static viewport fit and compact presentation |
| `artifacts/ipl-analytics/src/components/desktop-auth/auth-readability.css` | Input, sprite, selector and grounded-motion primitives |
| `artifacts/ipl-analytics/src/components/desktop-auth/cinematic-trophy.css` | Final desktop reference geometry and styling |
| `artifacts/ipl-analytics/src/components/CricFieldMascot.tsx` | Additive competitive/confident mood aliases; shared brand artwork preserved |
| `artifacts/ipl-analytics/e2e/desktop-auth.config.ts` | Dedicated browser configuration |
| `artifacts/ipl-analytics/e2e/desktop-auth.spec.ts` | Layout, auth, interaction, motion and color checks |
| `artifacts/ipl-analytics/public/branding/auth/` | Generated project-bound artwork |
| `docs/verification/auth-experience/README.md` | Current delivery notes |
| `docs/verification/auth-experience/ARTWORK.md` | Built-in image generation mode, source assets and prompt specifications |

## Configuration and visual limits

The previously checked public provider settings have email and Google enabled and Apple disabled. Apple remains connected in code but unavailable until enabled with valid Apple Developer/Supabase configuration. Do not insert provider secrets into the frontend.

To enable Apple, configure the Apple Services ID, associated Sign in with Apple app/key and Supabase HTTPS `/auth/v1/callback` return URL, then add the Services ID and generated secret to Supabase's Apple provider settings. Keep the application's `/account` URL on the redirect allowlist for localhost and production. Availability is discovered automatically. See [Supabase's Apple guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple).

The scene uses layered generated renders and six expression assets, not a WebGL mesh or independently rigged facial bones. The small hand gestures are shaded vector layers. This closely recreates the reference composition without claiming pixel identity to the source illustration. The mobile layout is retained from the preceding implementation and is outside this desktop refinement.

Artwork was produced with the built-in image-generation tool and copied into the workspace. Full saved paths and prompt specifications are in [ARTWORK.md](C:/Users/KIIT0001/Downloads/Data-Insight-Engine/Data-Insight-Engine/docs/verification/auth-experience/ARTWORK.md).
