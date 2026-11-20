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
  night: '#05070D',
  deep: '#0B1B3A',
  /** text over space: cool off-white */
  mist: '#EEF0F5',
  /** accents over space (section numbers, highlights, terminator, arcs) */
  accent: brand.blue,
  /** soft highlights (city lights, sun flare, glows) */
  accentLight: brand.blueLight,
  /** atmosphere blue (3D only) */
  haze: '#6FA6FF',
};

export const gradients = {
  /** blue → green, 135deg */
  brand: `linear-gradient(135deg, ${brand.blue}, ${brand.green})`,
  blue: `linear-gradient(135deg, ${brand.blueLight}, ${brand.blueDeep})`,
  green: `linear-gradient(135deg, ${brand.greenLight}, ${brand.greenDeep})`,
};

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
