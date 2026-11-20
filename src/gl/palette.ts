import { Color } from 'three';
import { brand, light, space } from '@/config/palette';

/** All palette entries, flat (values live in src/config/palette.ts). */
const TOKENS = { ...space, ...brand, ...light };
export type Token = keyof typeof TOKENS;

const cache = new Map<Token, Color>();

/** Palette colour for WebGL, in linear working space. */
export function token(name: Token): Color {
  let c = cache.get(name);
  if (!c) {
    c = new Color(TOKENS[name]);
    cache.set(name, c);
  }
  return c.clone();
}
