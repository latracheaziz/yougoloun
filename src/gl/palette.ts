import { Color } from 'three';

export type Token = 'night' | 'deep' | 'sand' | 'ember' | 'granite' | 'glow' | 'haze' | 'paper' | 'ink';

const cache = new Map<Token, Color>();

/**
 * Palette colour from the CSS design tokens (src/styles/index.css → @theme),
 * so HTML and WebGL can never drift apart. Returned in linear working space.
 */
export function token(name: Token): Color {
  let c = cache.get(name);
  if (!c) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
    c = new Color(raw || '#ff00ff');
    cache.set(name, c);
  }
  return c.clone();
}
