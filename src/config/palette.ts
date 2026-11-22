/**
 * YOUGOLOUN — THE palette. Single source for every colour on the site:
 *   • CSS: a Vite plugin (vite.config.ts) injects these as --p-* custom properties into <head>;
 *     Tailwind tokens in src/styles/index.css (@theme) point at them (bg-blue, text-ink, …).
 *   • WebGL: src/gl/palette.ts reads this file directly.
 * Edit the values here (e.g. when the SVG logo arrives) and everything follows.
 */

/** Brand colours — sampled from the logo, approximate until the SVG arrives. */
export const brand = {
  /** blue speech bubble */
  blue: '#4BAFE1',
  blueLight: '#6CC4EE',
  blueDeep: '#3A9AD3',
  /** green speech bubble */
  green: '#87B84D',
  greenLight: '#9CC566',
  greenDeep: '#74AE42',
  /** the microphone */
  navy: '#2B2A5C',
};

/** Light site (after the clouds) — derived from the brand. */
export const light = {
  paper: '#F5F3EF',
  paper2: '#ECE9E4',
  white: '#FFFFFF',
  /** body text + headings: near-black navy derived from brand.navy */
  ink: '#14142E',
  /** links / small highlighted text on paper or white — darker blue, WCAG AA (≈4.9:1 on paper) */
  link: '#1F6FA8',
  /** contact + footer band: deep navy based on brand.navy */
  band: '#1D1C45',
};

/**
 * Space part (hero → dive). No orange anywhere on the site: the accents are the logo's blues,
 * so this part follows the brand palette too.
 */
export const space = {
  /** base of the sky: a bright brand navy (not black); the 3D nebula adds blue/green light on top */
  night: '#0A1A3C',
  deep: '#12346A',
  /** text over space: cool off-white */
  mist: '#EEF0F5',
  /** accents over space (section numbers, highlights, terminator, arcs) */
  accent: brand.blue,
  /** soft highlights (city lights, sun flare, glows) */
  accentLight: brand.blueLight,
  /** atmosphere blue (3D only) — the logo's light blue */
  haze: brand.blueLight,
};

export const gradients = {
  /** blue → green, 135deg */
  brand: `linear-gradient(135deg, ${brand.blue}, ${brand.green})`,
  blue: `linear-gradient(135deg, ${brand.blueLight}, ${brand.blueDeep})`,
  green: `linear-gradient(135deg, ${brand.greenLight}, ${brand.greenDeep})`,
};

/**
 * Social platforms ("Follow us", src/sections/light/Socials.tsx): the section takes the colour of the
 * platform on screen as you scroll. Deepened so white text stays ≥ 4.5:1; no orange (Instagram's
 * gradient stops before its orange end). `bg`: gradient stops · `logo`: the logo on the white 3D tile ·
 * `ink`: dark text on this background (Snapchat yellow).
 */
export const platformColors = {
  tiktok: { bg: ['#0E2A30', '#050608'], logo: '#111114', ink: false },
  snapchat: { bg: ['#FFFC00', '#F2DF00'], logo: '#141414', ink: true },
  facebook: { bg: ['#1466D8', '#0A3F99'], logo: '#1466D8', ink: false },
  x: { bg: ['#202327', '#000000'], logo: '#000000', ink: false },
  youtube: { bg: ['#CC1016', '#7E080C'], logo: '#E0141B', ink: false },
  instagram: { bg: ['#5E2A84', '#B02C78'], logo: '#B02C78', ink: false },
} as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/(\d+)/g, '-$1');

/** `:root { --p-… }` — injected into <head> by the Vite plugin (available at first paint, no JS needed). */
export function paletteCss() {
  const vars = [
    ...Object.entries(space),
    ...Object.entries(brand),
    ...Object.entries(light),
    ...Object.entries(gradients).map(([k, v]) => [`gradient-${k}`, v] as const),
  ]
    .map(([k, v]) => `--p-${kebab(k)}:${v}`)
    .join(';');
  return `:root{${vars}}`;
}
