# Authentication artwork and live composition

Mode: built-in image generation. The user-provided cinematic login concept was the visual reference. Generated artwork is copied into the project; the application never depends on files under the generator's default output folder.

## Saved production assets

- `artifacts/ipl-analytics/public/branding/auth/stadium-sunset-v1.png`: empty stadium scenery, with all form controls, text, logos, trophies and characters removed from the reference composition.
- `artifacts/ipl-analytics/public/branding/auth/trophy-frame-v1.png`: isolated ornate gold trophy, with an empty dark face for live HTML controls. The final desktop form blends into the trophy’s blank dark display using translucent individual fields and a soft, borderless vignette; there is no outer rectangular card.
- `artifacts/ipl-analytics/public/branding/auth/mascot-poses-v1.png`: six volumetric facial poses in a 3-column, 2-row atlas. CSS selects each pose independently, masks it to a round leather ball, and applies the chosen franchise hue. The lower surface contains live team-name text, not a pasted crest.
- `ball-body-v1.png` is the earlier neutral leather-body fallback. The final visible facial rendering uses the six-pose atlas.

Original generator outputs are retained in `C:/Users/KIIT0001/.codex/generated_images/01a19092-d3ff-71c0-9b2e-f8e4eedf8329/`.

## Prompt specifications

### Stadium layer

Create a production website background asset by editing the supplied reference. Preserve the cinematic stylized 3D cricket stadium at sunset, golden floodlights on both sides, purple-blue sky, warm grass and cricket pitch foreground, bokeh crowd tiers, out-of-focus tree leaves upper left, and subtle cricket bat far right. Remove the entire trophy and pedestal, both mascots, all lettering including logo and handwritten quotes, controls, team flags, ribbons and doodle crowns. Reconstruct softly illuminated stadium and ground behind those objects. Keep the foreground empty for live layers. Match the reference's premium warm rendered lighting, texture and depth of field. Wide 16:9; no text, logos, mascots, trophy or UI.

### Trophy layer

Extract and recreate only the reference's magnificent polished gold trophy on a transparent exterior. Include finial, dome, ornate rim, curling handles, tapered columns and stepped plinth with reflective gold, warm luminous edges and carved detail. Front-facing symmetrical portrait 3:4 composition. The center face must be empty dark warm brown/black glass, ready for an HTML form. Remove all words, logos, controls, mascots, ribbons, background and grass. Preserve the realistic premium 3D metal finish. An isolated decorative shell, not a login screenshot.

### Mascot character reference

Recreate the adorable high-end 3D cricket-ball mascot as a neutral grayscale sprite with no logos, words or badges. Round tactile leather, raised left-side double stitching, pores, glossy lighting and warm floodlight rims. Large sculpted eyes with reflective irises, dimensional brows, cheeks and mouth. A confident playful smirk, not angry; lower quarter kept empty for live lettering. One coherent volumetric character, not an emoji pasted onto a ball. Full round silhouette centered with transparent exterior, no arms or environment.

### Final six-pose atlas

Create a production game sprite sheet of that exact grayscale character. A regular 3-column by 2-row grid of equal square cells, no gaps, separators or captions. Same entire round ball, centered at identical scale and position in each cell, approximately 86% cell coverage. Preserve raised stitching, sculpted features, eyes, pores and stadium reflections. Top row: confident smirk; surprised open eyes and O mouth; joyful laughing grin. Bottom row: thoughtful curious small smile; playful wink; eyes squeezed shut with an embarrassed smile. Same camera, silhouette, scale and lighting. No labels, badges, logos, floor or environment. CSS handles the atlas selection and circular exterior mask.

## Live behavior

The two balls roll and make small turf-level bounces toward measured trophy-base edges, then gently contact and return. The final desktop loop is gentle rather than a constant 360-degree idle spin, following the latest supplied brief. Separate ground shadows follow horizontal movement and stay below the bounce. The trophy has a restrained contact wobble. Form interaction pauses rivalry choreography; genuine pending authentication uses the existing measured travel transition. Team selection updates the global franchise context and the linked local logo, first ball, first ribbon and CTA; the second ball and ribbon use the configured rival. The final desktop One Game headline stays warm gold as the latest reference specifies.

The page is a fixed full-viewport composition. Its stage uses uniform scaling and adapts its underlying dimensions to occupy the entire screen without stretching round characters or creating page scrollbars.

Final desktop defaults: CSK yellow versus RCB red. Narrow fabric ribbons are restored outside the interactive fields. The live loading actor travels into the trophy display center; pending, recovery and failure behavior is tested using intercepted auth responses.
