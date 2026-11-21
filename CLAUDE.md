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
  Flags: `--all`, `--lang=en`, `--reduced`, `--fps`, `--query=nofx|tier=low`. Moments are listed at the top of the script.
- `npm run textures` — (re)download Earth maps. Only `public/textures/earth/sd/ocean.webp` is still used (land mask
  of the Contact mini globe); the other maps were deleted with the Earth — don't re-add them.
- `npm run capture-sites` — screenshot the live client sites (hajiss.com, ghaliachocolate.com; cookie banners are
  rejected/closed, never accepted) into `public/media/work/{hajiss,ghalia}/cover.webp`. Re-run when those sites change.
- `npm run media -- --brand <studio> <social> <analytics>` — optimize client images into `public/media/brand/`;
  `npm run media -- --placeholders` — regenerate portfolio placeholders in `public/media/work/`.
- Dev-only URL switches: `?nofx` (no postprocessing), `?tier=low|medium|high` (force a quality tier).

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
- **Canvas lifecycle** (`useCanvasLifecycle` in `src/pages/Home.tsx`): paused (`frameloop="never"`) once past
  `keys.paper[1]`, unmounted 4 s later, re-mounted when scrolling back up (hidden behind paper until `glReady`).
- **Light part** — normal document flow in `src/sections/light/*`. Order: `Arrival` (Hail topo map draws itself
  during the white-out, pin drop, coords scramble; map geometry in `topo.ts`) → `Statements` (pinned, word fill) →
  Services → Platforms → `Buzz` ("word of mouth" agency-identity interlude: typing name, live post with reactions,
  growth chart, funnel, notifications, click-to-react burst; labels in `ui.buzz`; no section number) → `Feed` (#studio, navy band: swipeable deck of the agency's own creatives from
  `public/media/feed`, story bars auto-advance, click = lightbox; `feedPosts` in `src/config/light.ts`, alts in
  `ui.feed.posts`) → `Portfolio` (pinned horizontal track on desktop, swipe on mobile) → Process (sticky cards) →
  FAQ → Contact (`CtaMarquee` band + mini globe). `ScrollProgress` = gradient bar after the space part.
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
- World state: mutable objects in `src/gl/state.ts` (`feed`, `dive`). The Director writes formation weights
  `feed.w = {hero, about, corner, dive}` (sum 1) + `reveal/meet/chatter`; the subject sits at `feed.anchor`.
- **`src/gl/feed/`** — the social-media world, all procedural (no model files): `geometry.ts` (extruded speech
  bubbles, heart, arrow, lathe megaphone/bell, rounded boxes — cached), `materials.ts` (clear-coated `glossy(token)`,
  Standard on the low tier), `objects.tsx` (LogoMark with live mic waveform, icons, cornerstone objects, Phone with a
  screen texture), `World.tsx` (every object = weighted blend of formation functions + idle float + spin from scroll
  velocity + push/spin away from the pointer; local x mirrored in RTL), `Chatter.tsx` (instanced comment bubbles,
  phones → logo), `Burst.tsx` (click/tap → glossy hearts), `Lights.tsx` (Lightformer studio env map, no HDR download).
  Background: `src/gl/space/Nebula.tsx` (brand sky sphere) + `Stars.tsx`. Phone screens use `brandImages`/`feedPosts`.
- Shaders: `src/gl/shaders/*` imported with `?raw`; output linear HDR, end with tonemapping + colorspace chunks.
- Colours: values in `src/config/palette.ts` (single source); WebGL reads them via `token()` (`src/gl/palette.ts`).
- Quality tiers in `src/config/quality.ts` (DPR cap, render scale, bloom levels, particles); `PerformanceMonitor`
  steps down at runtime. Postprocessing is the main GPU cost.
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
- Fonts (self-hosted): Clash Display, Alexandria, IBM Plex Sans / Sans Arabic, IBM Plex Mono. Film grain = CSS `.grain`.

## Arabic / RTL rules
- `<html lang dir>` per route (`/ar` rtl, `/en` ltr). Use logical properties (`ps-`, `ms-`, `start-`, `end-`).
- **No letter-spacing on Arabic** (breaks joining) — rules use `:lang(ar)`. Give Latin snippets inside Arabic `lang="en"`.
- **Never split Arabic into characters** (SplitText `lines,words` only).
- Western digits in both languages; wrap coordinates/phone/email in `dir="ltr"`. Mirror arrows with `rtl:-scale-x-100`.
- Horizontal scrollers: `scrollBy` in physical pixels (next = −width in RTL).

## Placeholders / TODO
- `src/config/site.ts`: domain (`url`), phone/WhatsApp number. Logo: typeset `Wordmark` until the SVG arrives.
- Portfolio images: placeholders in `public/media/work/*/cover.webp`.
- Privacy Policy page + footer link (Phase 4). Loader (Phase 4).
- `THREE.Clock` deprecation warning comes from R3F internals — ignored by `npm run check` (client OK).

## Phases
1. ✅ Setup, content (EN/AR), hero (Earth, later replaced by the social-media world)
2. ✅ Space camera journey
3. ✅ Redesign: space part ends in the clouds → light editorial site (all content sections, interactions)
4. Loader, page transitions, Privacy Policy, sound toggle
5. Responsive, performance, accessibility, SEO (prerender, JSON-LD `ProfessionalService`), polish
