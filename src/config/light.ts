/**
 * Configuration of the light site (after the clouds). No copy here — copy lives in content/*.
 */
import type { ProjectSlug } from '@content/types';
import { brand, light } from './palette';

// ── Services ────────────────────────────────────────────────────────────────────────
export type ServiceCategory = 'growth' | 'brand' | 'content';

/** Filter groups, by service number (client-defined). */
export const serviceCategories: Record<ServiceCategory, readonly string[]> = {
  growth: ['01', '07', '08', '09', '11'],
  brand: ['02', '10', '12'],
  content: ['03', '04', '05', '06'],
};

export const categoryOf = (num: string): ServiceCategory =>
  (Object.keys(serviceCategories) as ServiceCategory[]).find((c) => serviceCategories[c].includes(num)) ?? 'growth';

/** Client brand visuals (public/media/brand). */
export const brandImages = {
  studio: '/media/brand/studio-sm.webp',
  social: '/media/brand/social-sm.webp',
  analytics: '/media/brand/analytics-sm.webp',
} as const;

/** Hover preview per service: which brand visual, and which part of it (CSS background-position + zoom). */
export const servicePreviews: Record<string, { image: keyof typeof brandImages; position: string; zoom: number }> = {
  '01': { image: 'analytics', position: '82% 22%', zoom: 2.1 }, // growth charts
  '02': { image: 'studio', position: '62% 55%', zoom: 1.5 }, // the studio
  '03': { image: 'social', position: '50% 35%', zoom: 1.5 }, // post frame
  '04': { image: 'social', position: '12% 55%', zoom: 2.2 }, // heritage street
  '05': { image: 'analytics', position: '22% 88%', zoom: 2.4 }, // waveform
  '06': { image: 'social', position: '52% 48%', zoom: 2.2 }, // creator
  '07': { image: 'studio', position: '92% 45%', zoom: 2.2 }, // city through the window
  '08': { image: 'studio', position: '18% 62%', zoom: 2.0 }, // phone + ads
  '09': { image: 'analytics', position: '18% 48%', zoom: 2.0 }, // mobile analytics
  '10': { image: 'studio', position: '18% 22%', zoom: 1.9 }, // headline copy
  '11': { image: 'analytics', position: '20% 18%', zoom: 2.2 }, // dashboards
  '12': { image: 'social', position: '80% 66%', zoom: 2.4 }, // likes & reactions
};

// ── Portfolio ───────────────────────────────────────────────────────────────────────
/**
 * Each project wears one colour of the brand palette (no orange anywhere). `ink` is the text colour on
 * the card (always navy ink); `accent` only colours tags and borders.
 * `url`: the project's live website — its card image is a screenshot of it (`npm run capture-sites`).
 * Projects without a website keep a placeholder image.
 */
export const projects: Record<ProjectSlug, { accent: string; tint: string; ink: string; image: string; url?: string }> = {
  hajiss: { accent: brand.blue, tint: '#E3F2FA', ink: light.ink, image: '/media/work/hajiss/cover.webp', url: 'https://www.hajiss.com/' },
  ghalia: { accent: brand.green, tint: '#EDF5E4', ink: light.ink, image: '/media/work/ghalia/cover.webp', url: 'https://www.ghaliachocolate.com/' },
  odun: { accent: brand.navy, tint: '#E6E6F0', ink: light.ink, image: '/media/work/odun/cover.webp' },
};

// ── Platforms marquee (brand names, not translated) ────────────────────────────────
export const platforms = ['Meta', 'TikTok', 'Snapchat', 'Google', 'Salla', 'Zid', 'Shopify'] as const;

// ── Process dashboard (step 02: tracking set up; product names, not translated) ─────
export const trackingTags = ['Meta Pixel', 'GA4', 'TikTok Pixel', 'Snap Pixel'] as const;

// ── Studio feed (the agency's own campaign creatives, public/media/feed) ───────────
/** Order = deck order. `blur`: tiny blurred copy that fills the frame around non-square posts. Alts in ui.feed.posts. */
export const feedPosts = [
  { image: '/media/feed/growth.webp', blur: '/media/feed/growth-blur.webp' },
  { image: '/media/feed/dialogue.webp', blur: '/media/feed/dialogue-blur.webp' },
  { image: '/media/feed/voice-app.webp', blur: '/media/feed/voice-app-blur.webp' },
  { image: '/media/feed/workspace.webp', blur: '/media/feed/workspace-blur.webp' },
] as const;
