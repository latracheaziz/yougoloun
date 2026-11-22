import { BufferAttribute, PlaneGeometry } from 'three';
import { site } from '@/config/site';

/**
 * The Hail relief model — the stylised geography of the former flat SVG map:
 * map coordinates 1600 × 1000 (x east, y south), Hail at (820, 540), Aja = long granite ridge to the
 * west, Salma = massif to the south-east, the Nafud's dune lines to the north.
 *
 * World: 1 unit = 100 map px → the model is 16 × 10 units, Hail at the origin, x east, z south, y up.
 */
export const MAP = { w: 1600, h: 1000, hail: { x: 820, y: 540 } };
export const SCALE = 0.01;
export const toWorld = (x: number, y: number) => [(x - MAP.hail.x) * SCALE, (y - MAP.hail.y) * SCALE] as const;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Cheap deterministic value noise (2D). */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const ridged = (x: number, y: number) => {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < 4; o++) {
    s += amp * (1 - Math.abs(noise(x * f, y * f) * 2 - 1));
    amp *= 0.5;
    f *= 2.1;
  }
  return s;
};

/** A massif: an elongated, rotated bump with a rugged ridged-noise top. */
function massif(x: number, y: number, cx: number, cy: number, sx: number, sy: number, rot: number, height: number, seed: number) {
  const dx = x - cx;
  const dy = y - cy;
  const c = Math.cos(-rot);
  const s = Math.sin(-rot);
  const u = (dx * c - dy * s) / sx;
  const v = (dx * s + dy * c) / sy;
  const r = Math.sqrt(u * u + v * v);
  const wob = 1 + 0.12 * Math.sin(Math.atan2(v, u) * 3 + seed) + 0.06 * Math.sin(Math.atan2(v, u) * 7 + seed * 2);
  const body = 1 - smooth(0, 1, r / wob);
  const rough = ridged(x * 0.012 + seed, y * 0.012 - seed);
  return height * Math.pow(body, 1.35) * (0.62 + 0.55 * rough);
}

/** Height (world units) at a map point. */
export function heightAt(x: number, y: number) {
  let h = 0;
  h += massif(x, y, 430, 470, 175, 470, 0.12, 1.55, 3.1); // Aja
  h += massif(x, y, 1220, 760, 240, 170, -0.35, 0.95, 7.7); // Salma
  // the Nafud: long dune crests in the north, fading out towards Hail
  const nafud = 1 - smooth(120, 330, y);
  h += nafud * (0.07 + 0.06 * Math.sin(x * 0.011 + y * 0.05) * Math.sin(y * 0.12 + Math.sin(x * 0.004) * 2) + 0.03 * noise(x * 0.02, y * 0.02));
  // a shallow basin round Hail, gentle plain elsewhere
  const dh = Math.hypot(x - MAP.hail.x, (y - MAP.hail.y) * 1.3);
  h -= 0.05 * (1 - smooth(0, 260, dh));
  h += 0.05 * noise(x * 0.006, y * 0.006);
  return h;
}

/** The relief as a mesh (Hail at the origin). `aMap` keeps the map coordinates for the shader. */
export function terrainGeometry(segX: number, segY: number) {
  const g = new PlaneGeometry(MAP.w * SCALE, MAP.h * SCALE, segX, segY);
  g.rotateX(-Math.PI / 2);
  g.translate((MAP.w / 2 - MAP.hail.x) * SCALE, 0, (MAP.h / 2 - MAP.hail.y) * SCALE);
  const pos = g.attributes.position;
  const map = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const mx = pos.getX(i) / SCALE + MAP.hail.x;
    const my = pos.getZ(i) / SCALE + MAP.hail.y;
    pos.setY(i, heightAt(mx, my));
    map[i * 2] = mx;
    map[i * 2 + 1] = my;
  }
  g.setAttribute('aMap', new BufferAttribute(map, 2));
  g.computeVertexNormals();
  return g;
}

/** Map points of the named places (labels, hover highlight). */
export const PLACES = {
  aja: { x: 430, y: 470 },
  salma: { x: 1220, y: 760 },
  nafud: { x: 800, y: 170 },
} as const;
export type PlaceKey = keyof typeof PLACES;

// ── reach: real bearings + distances from Hail ───────────────────────────────────────
const CITIES = [
  { key: 'riyadh', lat: 24.7136, lon: 46.6753 },
  { key: 'jeddah', lat: 21.4858, lon: 39.1925 },
  { key: 'dubai', lat: 25.2048, lon: 55.2708 },
  { key: 'kuwait', lat: 29.3759, lon: 47.9774 },
  { key: 'doha', lat: 25.2854, lon: 51.531 },
  { key: 'cairo', lat: 30.0444, lon: 31.2357 },
] as const;
export type CityKey = (typeof CITIES)[number]['key'];

const rad = (d: number) => (d * Math.PI) / 180;
/** Cities as directions from Hail (x east, z south) with great-circle distance in km. */
export const REACH = CITIES.map((c) => {
  const φ1 = rad(site.hail.lat);
  const φ2 = rad(c.lat);
  const Δλ = rad(c.lon - site.hail.lon);
  const bearing = Math.atan2(Math.sin(Δλ) * Math.cos(φ2), Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ));
  const a = Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(a));
  return { key: c.key, dir: [Math.sin(bearing), -Math.cos(bearing)] as const, km: Math.round(km / 10) * 10 };
});
