# YOUGOLOUN (يقولون) — website

Site for a digital marketing & growth agency in Hail, KSA. يقولون = "they say".
Two parts, one page:
1. **3D part (cinematic, WebGL, bright brand-blue sky):** a social-media world — the logo's two speech bubbles as
   glossy 3D objects among phones, hearts, comments, megaphone, bell… → About: phones fan out, comment bubbles fly
   into the logo → four cornerstone objects (chart, target, camera, growth arrow) on orbits that merge round the logo
   → a dive into the logo and the clouds until the screen is white. (The Earth was removed at the client's request.)
2. **Light site (editorial, document scroll, brand blue/green/navy):** the cloud white becomes the paper background; a payoff
   ("27.5219° N · 41.6907° E — حائل / Hail, Saudi Arabia"), then positioning, services, platforms, portfolio,
   process, FAQ, contact.

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm run typecheck`
- `npm run check` — **phase gate**: boots Vite, opens /ar and /en (desktop + mobile) in headless Edge/Chrome,
  scrolls every section, fails on any console error, writes screenshots to `.check/`. `-- --quick` = hero only.
- `npm run moments` — key-moment screenshots (desktop + mobile, AR + EN) + contact sheets in `.check/moments/`.
  Flags: `--all`, `--space` (3D journey only, densely sampled), `--lang=en`, `--reduced`, `--fps`, `--only=6,7c`
  (name prefixes), `--wait=4800` (ms after each scroll; raise it to see entrance animations finished),
  `--query=nofx|tier=low` (use `tier=high` for 3D screenshots: headless WebGL is slow and would otherwise step down). Moments are listed at the top of the script.
- `npm run textures` — (re)download Earth maps. Only `public/textures/earth/sd/ocean.webp` is still used (land mask
  of the Contact mini globe); the other maps were deleted with the Earth — don't re-add them.
- `npm run world-assets` — download + optimise the CC0 assets of the 3D world (Poly Haven: sky HDRI + image, scanned
  sandstone/plaster/paving, quiver tree + shrubs via gltf-transform) into `public/media/world/`. `-- --force` refetches.
- `npm run capture-sites` — screenshot the live client sites (hajiss.com, ghaliachocolate.com; cookie banners are
  rejected/closed, never accepted) into `public/media/work/{hajiss,ghalia}/cover.webp`. Re-run when those sites change.
- `npm run media -- --brand <studio> <social> <analytics>` — optimize client images into `public/media/brand/`;
  `npm run media -- --placeholders` — regenerate portfolio placeholders in `public/media/work/`.
- Dev-only URL switches: `?nofx` (no postprocessing), `?tier=low|medium|high` (force + lock a tier),
  `?no=clouds,arch,plants,trees,voice,ribbon,sky,env,sun,shadows,planets,orb,water` (switch 3D layers off).
- `npm run perf` — real-use performance of the PRODUCTION build (build first): load timing, then a full wheel
  scroll recording main-thread freezes (long tasks, with the section) and fps per section. `--dev`, `--lang=ar`,
  `--dpr=1.5`. ⚠ Anything else on the GPU (the site open in a browser or in VS Code's preview) skews the fps.
- `npm run probe -- <track> <p> "<query>" …` — fps at one scroll position per URL variant, on this GPU
  (`DPR=1.5`, `PREVIEW=1` for the production build). Close the site in your own browser while probing.
- ⚠ Windows drive-letter case: `vite.config.ts` upper-cases the alias root (`fromRoot`). VS Code starts with
  `c:\`, the rest of the toolchain uses `C:\`; mixed ids bundled React twice → production crashed on load.

## Stack
Vite 8 (Rolldown) · React 19 · TypeScript 7 · React Router 8 · three r187 · @react-three/fiber 9 · drei 10 ·
@react-three/postprocessing 3 · GSAP 3.15 (ScrollTrigger, SplitText) + @gsap/react · Lenis · zustand · Tailwind 4.

## Copy — single source of truth
- All text comes from `docs/yougoloun-content.pdf` → `content/en.ts` and `content/ar.ts` (shape: `content/types.ts`).
  **Never hardcode copy in components** and never rewrite PDF copy.
- `ui` and `seo` blocks are NOT from the PDF (flagged) — interface microcopy. `ui.arrival` and
  `ui.serviceFilters` categories were specified by the client.
- Arabic was repaired from PDF extraction damage (lam-alef, mirrored brackets, detached diacritics). Keep it that way.
- Confirmed decisions: email `yougoloun@natheelco.com`; "Odun Pide" in both languages; default language `ar`;
  "Book a Strategy Call" → WhatsApp with a per-language message; SEO titles approved by the client.
- Non-copy config of the light site (service categories + preview crops, project accents, platforms):
  `src/config/light.ts`.

## Page model (important)
- **Space part** — `src/config/timeline.ts` holds every scroll timing of the 3D journey: 4 tracks (home, about,
  cornerstones, positioning = the dive). Each track is an invisible spacer (`src/scroll/Tracks.tsx`); each section's
  HTML is a **fixed full-screen stage** (`.stage[data-stage]`) faded by its `content.enter/exit` ranges.
  `src/scroll/journey.ts` holds per-frame progress (`journey.p[i]`) — read it in listeners/useFrame, not React state.
- **Cloud → paper** — the dive's cover stays total from `positioning.keys.cover`; `PaperLayer` (fixed, between canvas
  and stages) fades to `#F5F3EF` over `keys.paper`, so the tone-mapped/vignetted WebGL white becomes exact paper.
  The light document starts right after the last track; its first block (`Arrival`) has a transparent top fading to
  paper, so it slides over the white-out with no edge. The positioning track keeps full length on phones for this.
- **Boot loader** (`#yg-loader`, inline HTML + CSS in `index.html`, painted before any JS; palette via `--p-*`):
  YOUGOLOUN with each letter jumping in turn (Latin letters only — Arabic is never split). `src/loader.ts`:
  `finishLoader()` (letters leap off, curtain lifts) and `whenLoaded(fn)` (the hero intro waits for it). Home's
  `useBootLoader` sends it away once the 3D world is really drawn (`boot.glDrawn`: a GPU fence after the first
  frames, `Drawn` in Experience.tsx — glReady/"frames issued" came ~1–2 s early on iGPUs), or at once if the page
  reopens below the space part; min 1.7 s, max 8 s; CSS safety exit at 14 s. NotFound finishes it on mount.
- **Canvas lifecycle** (`useCanvasLifecycle` in `src/pages/Home.tsx`): paused (`frameloop="never"`) once past
  `keys.paper[1]`, unmounted 4 s later, re-mounted when scrolling back up (hidden behind paper until `glReady`).
- **Light part** — normal document flow in `src/sections/light/*`. Order: `Arrival` (word of mouth spreading from
  Hail across the peninsula, own lazy canvas `src/gl/spread/`) → `Statements` (pinned, particle word morph) →
  `Services` (editorial list — the client found cards/icons "school presentation": large light titles on hairlines;
  hover = the row fills navy from the bottom, full-bleed (`.svc-row`), the others step back, and a photo of the
  service (`servicePreviews` crop) opens beside the pointer with its glossy 3D object in front; click / tap opens the
  row: text + WhatsApp button pre-filled with the service (`ui.services`); touch shows the photo in the open row;
  text-tab filters, rows fold away) → Platforms → `Buzz` ("word of mouth" agency-identity interlude: typing name, live post with reactions,
  growth chart, funnel, notifications, click-to-react burst; labels in `ui.buzz`; no section number) → `Feed` (#studio, navy band: swipeable deck of the agency's own creatives from
  `public/media/feed`, story bars auto-advance, click = lightbox; `feedPosts` in `src/config/light.ts`, alts in
  `ui.feed.posts`) → `Portfolio` (pinned horizontal track on desktop, swipe on mobile) → `Process` (#process: a "growth
  dashboard" — desktop pins (CSS sticky, 85svh of scroll per step): step list with a gradient rail + one navy panel
  playing a DOM/SVG scene per step (audit radar · roadmap + tracking wires · creatives + channels live ·
  conversions chart with crosshair, A/B winner, budget); touch/tablet/reduced motion: stacked steps, each with
  its own panel. Scene entrances = GSAP `useScene` (natural DOM = finished state); idle loops = `.proc-*` CSS,
  paused off screen; labels in `ui.process`) →
  FAQ → Contact (`CtaMarquee` band + mini globe) → `Socials` (#social "Follow us", after Contact — modelled on
  ghaliachocolate.com's collections: pinned, 62svh of scroll per platform; the screen takes each platform's colour
  (`platformColors` in palette.ts, the next one grows as a clip-path circle out of the icon), giant names slide
  sideways with the scroll, the 3D icon turns over to the next logo, name/line/button swap at mid-turn; rail
  jumps; `data-tone` follows the colour (Snapchat yellow = light). Reduced motion: a grid of coloured cards).
  `ScrollProgress` = gradient bar after the space part.
- **Pinning = CSS sticky, not GSAP `pin`** (pin-spacers break in this layout): give the section extra height, make an
  inner frame `sticky top-0 h-[100svh]`, drive the animation with a scrub ScrollTrigger `top top → bottom bottom`.
- Portfolio cards with a `url` (`src/config/light.ts`) show the real site screenshot and link to it (new tab);
  Odun Pide has no site → placeholder.
- Navigation: `scrollToSection(id)` (Lenis) works for track ids and any element id. Active section: tracks in the
  space part, an IntersectionObserver for light sections.
- Header tone: every stage/section declares `data-tone="dark|light"` (the dive title flips to light as the clouds
  brighten); the header probes what's under it and switches text colour + glass. Hides on scroll down.

## WebGL (space part)
- One fixed `<Canvas>` (`src/gl/Experience.tsx`), lazy-loaded after first paint.
- **`src/gl/Director.tsx`** maps scroll → camera shot + world state (pure function of scroll). Story coordinate
  `G = sectionIndex + p`; shots keyframed in `KEYS`; the fall is procedural (`diveShot`). Tweak framing there,
  timing in `timeline.ts`. Only the RTL mirror and the portrait/landscape blend are damped.
- World state: mutable objects in `src/gl/state.ts` (`world`, `dive`). The Director writes `world.G`, side/land,
  pointer, `reveal/meet` (cornerstones) and the ribbon travel.
- **`src/gl/world/`** — a sunlit place of conversation over a sea of clouds, all procedural (no model files):
  `layout.ts` (every position, metres — the camera path is written against it), `Sky.tsx` (sky dome + `SUN_DIR`),
  `World.tsx` (sun with a camera-following shadow frustum, hemisphere fill, the sky HDR as env map),
  `Sky.tsx` (photographed sky graded to the brand blue; `SUN_DIR` measured on the photo — keep them in sync),
  `Architecture.tsx` (hero island: blue/green bubble portals on a pool · walkway of arch frames with the agency's
  creatives as lit prints · plaza of four arches (cornerstones) round the orb), `stone.ts` (scanned stone sampled
  triplanar in world space — only the scan's DETAIL is used, colour comes from our palette: `wallStone` Hail
  sandstone, `trimStone` limestone, `floorStone` travertine; no UVs, never stretches), `Plants.tsx` (real models,
  placed from `PLANTS` in layout.ts), `Cypress.tsx` (instanced foliage cards), `ripples.ts` (pool normals),
  `CloudSea.tsx`, `Ribbon.tsx` (name band; flips u where the print would read mirrored), `Voice.tsx` (hold to
  awaken: burst of glossy hearts/comments + pool rings; charge in `src/interaction/hold.ts`, shown by the cursor's
  `hold` mode and the hero's hint via `--hold`). **No orange**: the architecture is warm sand, not terracotta.
- **Gestures** (`src/interaction/hold.ts`, window listeners — stages are `pointer-events: none` over the canvas):
  quick click → `pick` (scene raycasts it) · press that travels → drag to look (mouse; touch = scroll) · press that
  stays → hold to awaken. `Planets.tsx`: the cornerstones lift off their plinths into tilted orbits round the orb
  (merging into one ring at `meet`); hover → cursor 'view' (`setCursorOverride`), click → `useApp.focus` → the
  Director flies to that planet (`world.focusW`) and `PlanetCard` (Cornerstones.tsx) opens; Esc / ✕ / empty click /
  scroll close it. `ChapterRail` = numbered chapter stops on the end edge (labels `ui.rail`). Dev: `window.__app`
  is the store (moments uses it for `{ focus: i }`).
  Glossy icon geometry/materials live in `src/gl/props/`.
- Shaders: `src/gl/shaders/*` imported with `?raw`; output linear HDR, end with tonemapping + colorspace chunks.
- Colours: values in `src/config/palette.ts` (single source); WebGL reads them via `token()` (`src/gl/palette.ts`).
- Quality tiers in `src/config/quality.ts`; integrated GPUs (renderer string) start at 'medium'. Measured costs
  on an Intel iGPU: the postprocessing composer (~40%), the stone shader, the shadow pass, mirror pools (a full
  extra scene render each). So: composer (N8AO half-res → bloom → Neutral tone mapping → contrast → vignette) only
  on 'high'; otherwise the renderer tone-maps itself (same Neutral curve) with native MSAA. One mirror pool at a
  time, 'high' only. Shadow map refreshed at 30 Hz. Integrated GPUs: DPR cap 1.25 and 1× while scrolling
  (`MotionDpr`, full sharpness ~0.35 s after it stops). Triplanar stone samples only contributing projections.
  No `backdrop-filter` over the live canvas, no blend-mode grain, never write custom properties on <html> per frame.
- **Main-thread rules** (measured freezes): every canvas compiles its shaders with `compileAsync` before its
  first frame and pre-uploads textures one per frame (`Precompile.tsx`; frameloop 'never' until done); images
  for WebGL are decoded off the main thread (`useBitmapTexture` / `loadBitmapTexture` in `src/gl/bitmap.ts`,
  never drei `useTexture`); `prodGl` turns off per-program shader error checks; every canvas uses
  `resize={{ scroll: false }}`; no layout reads in per-frame / per-pointermove code (the header's tone comes
  from the active stage or cached section offsets — never `elementsFromPoint`); the light site mounts at idle
  after first paint (`useLightSite` in Home.tsx; `scrollToSection` asks for it via the `yg:light` event). **Never scale the render below the screen resolution and keep MSAA + clear-coat on every
  tier** — the client saw renderScale < 1 / no AA / Standard materials as "low quality". Bloom only catches real
  highlights (threshold 0.95); no chromatic aberration. Logo bubbles + blue heart carry a baked vertex-colour
  gradient (`gradient()` in geometry.ts, `glossy(…, { gradient: true })`).
- **Word of mouth** (arrival, `src/gl/spread/`, own lazy canvas mounted near view by `Arrival.tsx`, 320vh):
  `crowd.ts` builds a crowd of dots on the real land (world mask `ocean.webp`, window lon 30.5–60 / lat 12–33.5)
  and precomputes when the conversation reaches each person (Dijkstra from Hail over a neighbour graph with
  random delays; each city hops to its 3 nearest cities after a delay). `WordOfMouth.tsx`: points + "who told
  whom" lines + city-hop arcs, all driven by `front` (scroll); camera close on Hail → whole region; notification
  bubbles (`ui.buzz.notifications`), funnel HUD (`ui.buzz.funnel`), city tags (`ui.arrival.cities`); cursor parts
  the crowd, drag orbits, hold broadcasts a wave. Light pulses keep flowing outwards through the network.
  `Buzz.tsx`: heat glow under the people talking, ~30 influencer pins (glossy heads on stems) that pop up when
  reached, glossy hearts/comments rising from the crowd (more while scrolling, a burst on broadcast). Live feed
  panel (start side, landscape; `ui.buzz.live/handle`, notifications · city). Shared state in `state.ts`.
  Portrait: the camera turns ~45° so the peninsula's NW→SE diagonal fills the tall screen.
- **Light-site 3D** (`src/gl/stage/`, lazy, one small transparent canvas each, `useNear` mounts near view and
  pauses off screen; `Studio.tsx` = Lightformer reflections + Neutral tone mapping, no postprocessing):
  `WordMorph.tsx` in Statements (the from/to words drawn with the display font, sampled into ~14k extruded
  particles; scroll morphs from₀→to₀→from₁… via `stageAt()`, muted ink → brand gradient, swirl through depth;
  cursor repels, hold explodes, the word tilts with the mouse; the statement text stays as `sr-only`),
  `ObjectStage.tsx` (glossy prop per item, morphs between items): the Services showcase (`SERVICE_OBJECTS`,
  over the service's brand-image crop). `SocialFlip.tsx` ("Follow us", `Socials.tsx`): ONE pearl-white glossy
  app-icon tile with a logo extruded on each face (Simple Icons CC0 paths in `src/config/social.ts`); its turn
  follows the scroll, and the face turning away is re-skinned (logo geometry + colour) while hidden, so every
  half-turn shows the next platform. Leans to the pointer, hops on each flip, drag spins it (settles on a
  whole turn). Driven by a mutable `FlipRig`; a flat icon shows until it has compiled.
- Small extra WebGL: `src/gl/MiniGlobe.tsx` (dotted globe in Contact, own lazy chunk, mounted near view) and
  `src/interaction/distort.ts` (ONE raw WebGL2 canvas for portfolio hover distortion, attached only while hovering).
- `prefers-reduced-motion`: no dive/shake/streaks/cloud layers — static shot + plain fade to white.

## Design system
**All colour values live in `src/config/palette.ts`** (brand values sampled from the logo, approximate until
the SVG arrives). A Vite plugin (`vite.config.ts`) injects them as `--p-*` custom properties into `<head>`;
Tailwind tokens in `src/styles/index.css` (`@theme`) only point at them; WebGL reads the file via `token()`.

**Space part** — night, deep, mist (text), accent = brand blue, accentLight = brand blue-light, haze (3D only). **No orange anywhere on the site.**

**Light site** (wrapper `.light`; never give it a background — the Arrival top must stay transparent):
- Brand: blue `#4BAFE1` (light `#6CC4EE` / deep `#3A9AD3`), green `#87B84D` (`#9CC566` / `#74AE42`), navy `#2B2A5C`;
  brand gradient blue → green 135° (`.bg-brand-gradient`, `var(--p-gradient-brand)`; also `--p-gradient-blue/green`).
- Text: ink `#14142E` (near-black navy) on paper `#F5F3EF` / paper-2 / white. Muted = ink 64% (`.muted`).
- **Contrast rules:** never blue/green text on paper/white, never white text on blue/green. Links / small
  highlighted text on light: `text-link` (`#1F6FA8`, AA) or `.link`. Blue/green are for fills, gradients,
  hover states, highlights, the cursor, chips, process accents and decorative shapes (SVG gradients, not text).
- CTAs: `.btn-brand` (gradient + navy text) or `.btn-navy` (navy + white). The header CTA is ember over space and
  switches to the gradient when the header tone is light.
- Dark band (Contact + Footer): `.band` (deep navy `#1D1C45`) + `.tone-dark` + `data-tone="dark"`; hovers use blue-light.
- Motif: the logo's speech bubble — `.bubble` (pill with a squared bottom-start corner), `BubbleMark` (two-bubble
  placeholder logo in `Wordmark.tsx`), `SectionMark variant="brand"`, the cursor's hover/label states, process cards.
  Keep it subtle.
- Grid: `.shell` + `.grid-12`; sections use `.section-y`; dividers `.hairline` (ink 12%).
- Type: `.display` headlines, `.h-section` section titles, `.label` small mono caps.
- Components: `.chip` (pressed = gradient), `.expander` (grid 0fr→1fr, toggle `data-open`; ⚠ never name a class
  `collapse` — Tailwind utility). Portfolio cards keep each project's own accent (`src/config/light.ts`); their text
  uses the project's dark `ink`, accents only on tags/borders.
- Interactions: `Cursor` (`data-cursor="view|drag|talk"`), `Magnetic`, `useReveal(scope)` (`[data-reveal="lines|up"]`).
- Fonts (self-hosted, Fontsource): **Zain** for ALL text — Arabic + Latin, headlines (700) + body (400) — chosen by
  the client from a reference (light, low-contrast geometric); IBM Plex Mono only for the Latin small-caps labels.
  `--font-display` / `--font-body` both point at it; canvas text (Ribbon) loads it with `document.fonts.load`.
  Film grain = CSS `.grain`.

## Arabic / RTL rules
- `<html lang dir>` per route (`/ar` rtl, `/en` ltr). Use logical properties (`ps-`, `ms-`, `start-`, `end-`).
- **No letter-spacing on Arabic** (breaks joining) — rules use `:lang(ar)`. Give Latin snippets inside Arabic `lang="en"`.
- **Never split Arabic into characters** (SplitText `lines,words` only).
- Western digits in both languages; wrap coordinates/phone/email in `dir="ltr"`. Mirror arrows with `rtl:-scale-x-100`.
- Horizontal scrollers: `scrollBy` in physical pixels (next = −width in RTL).

## Placeholders / TODO
- `src/config/site.ts`: domain (`url`), phone/WhatsApp number. Logo: typeset `Wordmark` until the SVG arrives.
- Portfolio images: placeholders in `public/media/work/*/cover.webp`.
- Social accounts: `url` + `handle` in `src/config/social.ts` are guesses from @yougoloun — replace with the real ones.
- Privacy Policy page + footer link (Phase 4).
- `THREE.Clock` deprecation warning comes from R3F internals — ignored by `npm run check` (client OK).

## Phases
1. ✅ Setup, content (EN/AR), hero (Earth, later replaced by the social-media world)
2. ✅ Space camera journey
3. ✅ Redesign: space part ends in the clouds → light editorial site (all content sections, interactions)
4. ✅ Loader · page transitions, Privacy Policy, sound toggle
5. Responsive, performance, accessibility, SEO (prerender, JSON-LD `ProfessionalService`), polish
