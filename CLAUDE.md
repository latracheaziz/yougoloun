# YOUGOLOUN (يقولون) — website

Cinematic, scroll-driven 3D site for a digital marketing & growth agency in Hail, KSA.
Concept: "Moving Brands Forward" — the camera travels from Earth in space → the Gulf → a dive through
the clouds → Hail (Aja & Salma mountains, Nafud dunes) → back to space. يقولون = "they say".

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm run typecheck`
- `npm run check` — **phase gate**: boots Vite, opens /ar and /en (desktop + mobile) in headless Edge/Chrome,
  scrolls every section, fails on any console error, writes screenshots to `.check/`. Use `-- --quick` for the hero only.
- `npm run textures` — (re)download + compress Earth maps into `public/textures/earth/{hd,sd}` (`-- --force` to re-encode)

## Stack
Vite 8 (Rolldown) · React 19 · TypeScript 7 · React Router 8 · three r187 · @react-three/fiber 9 · drei 10 ·
@react-three/postprocessing 3 · GSAP 3.15 (ScrollTrigger, SplitText) + @gsap/react · Lenis · zustand · Tailwind 4.

## Copy — single source of truth
- All text comes from `docs/yougoloun-content.pdf` → `content/en.ts` and `content/ar.ts` (shape: `content/types.ts`).
  **Never hardcode copy in components** and never rewrite PDF copy.
- `ui` and `seo` blocks are NOT from the PDF (flagged in the files) — interface microcopy, needs client review.
- Arabic was repaired from PDF extraction damage (lam-alef, mirrored brackets, detached diacritics). Keep it that way.
- Confirmed decisions: email `yougoloun@natheelco.com`; "Odun Pide" in both languages; default language `ar`.

## Layout model (important)
- `src/config/timeline.ts` holds **every scroll timing**. Each section owns a *track* of `length` vh; tracks are
  back-to-back, so total scroll = Σ lengths (+ footer). Mobile multiplies lengths by `mobileScale`.
- `src/scroll/Tracks.tsx` renders invisible spacer tracks. Each section's HTML is a **fixed full-screen stage**
  (`.stage[data-stage=id]`) faded in/out by its `content.enter/exit` ranges (CSS vars `--in` / `--out`).
  Without JS (`html:not(.js)`) stages fall back to normal flow.
- `src/scroll/journey.ts` — mutable per-frame scroll state (`journey.p[i]` = local progress of section i).
  Read it in `useFrame` / DOM listeners; don't put it in React state.
- Navigation: `scrollToSection(id)` from `src/scroll/SmoothScroll.tsx` (Lenis). Focus inside a hidden stage scrolls to it.

## WebGL
- One fixed `<Canvas>` (`src/gl/Experience.tsx`), lazy-loaded after first paint. One WebGL context for the whole site.
- `src/gl/Director.tsx` drives camera + worlds from `journey`. World state lives in mutable objects
  (`src/gl/space/state.ts`), read by components in `useFrame` — no React re-renders per frame.
- Globe orientation: nested roll(Z) ⊃ tilt(X) ⊃ spin(Y); `spinToFace(lon)` + `tilt = lat` faces a point to +Z.
  Lat/lon convention in `src/gl/geo.ts` (matches three's SphereGeometry UVs).
- Shaders are `.glsl/.vert/.frag` files imported with `?raw` from `src/gl/shaders/`. Output linear HDR; end with
  `#include <tonemapping_fragment>` + `#include <colorspace_fragment>`. Renderer is `flat`; tone mapping is the last
  postprocessing effect (ACES).
- Colours: CSS tokens in `src/styles/index.css` (`@theme static`) are the single source; WebGL reads them via
  `token()` in `src/gl/palette.ts`.
- Quality: `src/config/quality.ts` tiers (high/medium/low); texture set (hd/sd) fixed at start-up; drei
  `PerformanceMonitor` steps tiers at runtime but never above the device's start tier.

## Design system
- Palette: night `#05070D`, deep `#0B1B3A`, sand `#E8D3B0`, ember `#FF6B2C`, granite `#3A2E2A`, glow `#FFC46B` (+ haze `#6FA6FF`, 3D only).
- Fonts (self-hosted): Clash Display (Latin display), Alexandria (Arabic display), IBM Plex Sans / Sans Arabic (body),
  IBM Plex Mono (labels). Arabic pages swap `--font-display` / `--font-body`.
- `.display` huge titles (tight tracking for Latin only), `.label` small mono caps, `.btn .btn-primary/.btn-ghost`.
- Film grain is a CSS overlay (`.grain`), not a postprocessing pass.

## Arabic / RTL rules
- `<html lang dir>` is set per route (`/ar` rtl, `/en` ltr). Use logical properties (`ps-`, `ms-`, `start-`, `end-`).
- **No letter-spacing on Arabic** (breaks joining) — rules use `:lang(ar)`. Give Latin snippets inside Arabic `lang="en"`.
- **Never split Arabic into characters** (SplitText `type: 'lines,words'` only).
- Western digits in both languages (as in the PDF); wrap coordinates/phone/email in `dir="ltr"`.
- Mirror horizontal motion with `dirSign(dir)`; the 3D layout mirrors via `useApp().dir`.

## Placeholders / TODO
- `src/config/site.ts`: domain (`url`), phone/WhatsApp number.
- Logo: typeset `Wordmark` until the official SVG arrives. Project photos: placeholders (Phase 3).
- `THREE.Clock` deprecation warning comes from R3F internals (not our code).

## Phases
1. ✅ Setup, content (EN/AR), Earth hero
2. Scroll camera journey (Earth → GCC → dive → Hail)
3. All content sections wired to the journey
4. Micro-interactions, loader, menu, page transitions, Privacy Policy
5. Responsive, performance, accessibility, SEO (prerender, JSON-LD `ProfessionalService`), polish
