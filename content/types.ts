/**
 * Shape of all site copy. `en.ts` and `ar.ts` must both satisfy `Content`,
 * so a missing or extra string in one language is a type error.
 *
 * Source of truth: docs/yougoloun-content.pdf. Everything is copied verbatim,
 * except the `ui` and `seo` blocks, which are NOT in the PDF and need review.
 */
export type Lang = 'ar' | 'en';
export type Dir = 'rtl' | 'ltr';

/** Sections reachable from the menu (ids are the same in both languages). */
export type NavTarget = 'home' | 'about' | 'services' | 'portfolio' | 'process' | 'faq' | 'contact';
export type CornerstoneKey = 'performance' | 'strategy' | 'production' | 'growth';
export type ProjectSlug = 'hajiss' | 'ghalia' | 'odun';

export interface Content {
  lang: Lang;
  dir: Dir;
  brand: { name: string; nameAlt: string };

  /** PDF §1 */
  nav: {
    items: { target: NavTarget; label: string }[];
    privacy: string;
    /** "Let's Talk / Book a Strategy Call" */
    cta: { short: string; long: string };
  };

  /** PDF §2 */
  hero: {
    tagline: string;
    headline: string;
    subheadline: string;
    actions: { primary: string; secondary: string };
    pillars: string[];
  };

  /** PDF §3 */
  about: { title: string; label?: string; body: string };

  /** PDF §4 */
  cornerstones: {
    title: string;
    /** "We operate at the intersection…" split at the em dash for layout. */
    statement: { lead: string; emphasis: string };
    items: { key: CornerstoneKey; title: string; /** English term shown in the AR copy */ term?: string; body: string }[];
  };

  /** PDF §5 */
  positioning: {
    label: string;
    title: string;
    items: { num: string; from: string; to: string; body: string }[];
  };

  /** PDF §6 */
  services: {
    title: string;
    label: string;
    items: { num: string; title: string; body: string }[];
  };

  /** PDF §7 — "Scope" lists are split on commas into tags (same words). */
  portfolio: {
    title: string;
    label?: string;
    scopeLabel: string;
    items: { slug: ProjectSlug; name: string; nameAlt: string; description: string; scope: string[] }[];
  };

  /** PDF §8 */
  process: {
    title: string;
    label: string;
    stepLabel: string;
    steps: { num: string; title: string; body: string }[];
  };

  /** PDF §9 */
  faq: { title: string; label: string; items: { q: string; a: string }[] };

  /** PDF §10 */
  contact: {
    headline: string;
    body: string;
    labels: { email: string; phone: string; location: string };
    location: string;
    copyright: string;
  };

  /** ⚠ NOT FROM THE PDF — interface microcopy. Review before launch. */
  ui: {
    skipToContent: string;
    scrollHint: string;
    menu: string;
    close: string;
    switchLang: { label: string; short: string; ariaLabel: string };
    /** "Hold to awaken" hint in the hero (3D interaction; not from the PDF). */
    holdHint: string;
    /** Chapter rail of the 3D journey (4 chapters, track order). */
    rail: { label: string; chapters: string[] };
    cursor: { view: string; drag: string; talk: string; react: string; hold: string };
    altitude: string;
    localTime: string;
    sound: { on: string; off: string };
    whatsapp: string;
    /** Pre-filled WhatsApp message for "Book a Strategy Call". */
    whatsappMessage: string;
    loading: string;
    hailLabel: string;
    earthCredit: string;
    notFound: { title: string; back: string };
    /** Payoff shown as the clouds clear (wording given by the client). */
    /** Arrival: the place name + the reach arcs' cities (src/gl/hail/terrain.ts REACH). */
    arrival: { place: string; cities: Record<'riyadh' | 'jeddah' | 'dubai' | 'kuwait' | 'doha' | 'cairo', string> };
    /** Services filter chips (categories defined by the client). */
    serviceFilters: { all: string; growth: string; brand: string; content: string };
    carousel: { previous: string; next: string };
    /** Place names on the arrival map. */
    mapLabels: { aja: string; salma: string; nafud: string };
    visitSite: string;
    /** "Word of mouth" interlude (agency identity visuals): short interface labels. */
    buzz: {
      word: string;
      hashtag: string;
      handle: string;
      live: string;
      growth: string;
      funnelTitle: string;
      notifications: readonly string[];
      funnel: readonly string[];
      hint: string;
    };
    /** Studio feed: a swipeable deck of the agency's own creatives. `posts` = image alts, in feedPosts order. */
    feed: {
      title: string;
      hint: string;
      open: string;
      previous: string;
      next: string;
      posts: readonly string[];
    };
    /** Portfolio: the agency's story video under the section title (sound labels: `sound`). */
    showreel: { title: string; play: string; pause: string };
    /** Services: the per-service WhatsApp button and its pre-filled message (service title appended). */
    services: { ask: string; message: string };
    /** "Follow us" (after Contact; accounts in src/config/social.ts). `about`: one line per platform. */
    social: {
      title: string;
      hint: string;
      follow: string;
      newTab: string;
      about: { tiktok: string; snapchat: string; facebook: string; threads: string; youtube: string; instagram: string; bluesky: string };
    };
    /** "How we work": the dashboard scene shown beside each step (short interface labels). */
    process: {
      /** Panel title per step (01 → 04). */
      scenes: readonly string[];
      audit: { axes: readonly string[]; today: string; potential: string; found: string };
      roadmap: { title: string; weeks: string; rows: readonly string[]; tracking: string; site: string; connected: string };
      launch: { formats: readonly string[]; channels: string; live: string };
      scale: { chart: string; week: string; test: string; winner: string; budget: string; scaling: string };
    };
  };

  /** ⚠ NOT FROM THE PDF — meta tags composed from PDF phrases. Review before launch. */
  seo: { title: string; description: string; ogLocale: string };
}
