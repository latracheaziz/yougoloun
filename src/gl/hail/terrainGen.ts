/**
 * Stylised Hail terrain — pure functions, run inside a Web Worker (terrain.worker.ts).
 *
 * World axes: +X east, −Z north, +Y up. 1 unit ≈ 20 m. Hail (the pin) sits at the origin.
 *  • Aja      — long jagged granite ridge to the west
 *  • Salma    — smaller granite massif to the south-east
 *  • Nafud    — sand sea with sharp-crested dunes to the north
 *  • Hail     — a flattened basin around the origin
 * Output: positions, normals, albedo colours (linear), baked sun shadow per vertex.
 */

// ── 2D simplex noise (Gustavson), seeded ──────────────────────────────────────────────
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1],
];
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function makeNoise(seed: number) {
  const p = new Uint8Array(256).map((_, i) => i);
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  return (x: number, y: number) => {
    const sk = (x + y) * F2;
    const i = Math.floor(x + sk);
    const j = Math.floor(y + sk);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const g = GRAD[perm[ii + perm[jj]] & 7];
      t0 *= t0;
      n += t0 * t0 * (g[0] * x0 + g[1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const g = GRAD[perm[ii + i1 + perm[jj + j1]] & 7];
      t1 *= t1;
      n += t1 * t1 * (g[0] * x1 + g[1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const g = GRAD[perm[ii + 1 + perm[jj + 1]] & 7];
      t2 *= t2;
      n += t2 * t2 * (g[0] * x2 + g[1] * y2);
    }
    return 70 * n; // ≈ [-1, 1]
  };
}

const noise = makeNoise(275219);
const noise2 = makeNoise(416907);

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function fbm(x: number, y: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * f, y * f) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

/** Ridged multifractal — sharp granite crests. Returns ≈ 0..1. */
function ridged(x: number, y: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let weight = 1;
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(noise2(x * f, y * f));
    n *= n * weight;
    weight = Math.min(1, n * 2);
    sum += n * amp;
    f *= 2.1;
    amp *= 0.5;
  }
  return sum;
}

export interface TerrainMasks {
  aja: number;
  salma: number;
  nafud: number;
  crest: number;
}

export function sampleTerrain(x: number, z: number, masks?: TerrainMasks) {
  // Hail plain: gentle undulation + gravel texture
  let h = fbm(x * 0.0021, z * 0.0021, 4) * 7 + fbm(x * 0.013, z * 0.013, 3) * 1.4;

  // Aja — long N–S granite ridge to the west
  const ajaX = -360 + 70 * noise(z * 0.0016, 3.1);
  const da = (x - ajaX) / 140;
  const aja = Math.exp(-da * da) * (1 - smoothstep(520, 900, Math.abs(z + 80)));
  const rA = ridged(x * 0.0052, z * 0.0052, 5);
  h += aja * (22 + 78 * rA * rA + ridged(x * 0.02, z * 0.02, 3) * 4.5);

  // Salma — south-east massif
  const ds = Math.hypot(x - 440, z - 420) / 180;
  const salma = Math.exp(-ds * ds);
  const rS = ridged(x * 0.0068 + 5.3, z * 0.0068, 4);
  h += salma * (16 + 60 * rS * rS);

  // Nafud — sharp-crested dunes to the north
  const nafud = smoothstep(-230, -460, z);
  const warp = fbm(x * 0.0028, z * 0.0028, 3) * 2.6;
  const phase = (x * 0.42 + z * 0.9) * 0.032 + warp;
  const d = 0.5 + 0.5 * Math.sin(phase);
  const crest = Math.pow(d, 2.4);
  h += nafud * (crest * 17 + fbm(x * 0.006, z * 0.006, 3) * 9 + 7);

  // Hail basin — flatten around the pin
  const dc = Math.hypot(x, z) / 150;
  h *= 0.3 + 0.7 * (1 - Math.exp(-dc * dc));

  if (masks) {
    masks.aja = aja;
    masks.salma = salma;
    masks.nafud = nafud;
    masks.crest = crest;
  }
  return h;
}

// ── mesh ─────────────────────────────────────────────────────────────────────────────
export interface TerrainRequest {
  size: number;
  segments: number;
  /** World direction towards the sun (for the baked shadows). */
  sun: [number, number, number];
}

export interface TerrainResult {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  shadow: Float32Array;
  index: Uint32Array;
  groundAtPin: number;
}

/** Grid denser near the pin, coarser at the horizon (fog hides the far edge). */
const warp = (u: number) => 0.34 * u + 0.66 * Math.sign(u) * u * u;

const srgb = (hex: number) => {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => Math.pow(v / 255, 2.2));
  return c as [number, number, number];
};
const PLAIN = srgb(0xc7aa84);
const GRAVEL = srgb(0x9a7f62);
const DUNE = srgb(0xdc9f66);
const DUNE_CREST = srgb(0xf0cf9c);
const GRANITE = srgb(0x3a2e2a);
const GRANITE_WARM = srgb(0x7a4f3f);
const mix3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function buildTerrain({ size, segments, sun }: TerrainRequest): TerrainResult {
  const n = segments + 1;
  const half = size / 2;
  const count = n * n;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const shadow = new Float32Array(count);
  const masks: TerrainMasks[] = new Array(count);

  for (let j = 0; j < n; j++) {
    const z = warp((j / segments) * 2 - 1) * half;
    for (let i = 0; i < n; i++) {
      const x = warp((i / segments) * 2 - 1) * half;
      const k = j * n + i;
      const m = { aja: 0, salma: 0, nafud: 0, crest: 0 };
      positions[k * 3] = x;
      positions[k * 3 + 1] = sampleTerrain(x, z, m);
      positions[k * 3 + 2] = z;
      masks[k] = m;
    }
  }

  // normals from grid neighbours (non-uniform spacing handled by using real positions)
  const P = (k: number) => [positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const l = P(j * n + Math.max(0, i - 1));
      const r = P(j * n + Math.min(n - 1, i + 1));
      const d = P(Math.max(0, j - 1) * n + i);
      const u = P(Math.min(n - 1, j + 1) * n + i);
      const ax = r[0] - l[0], ay = r[1] - l[1], az = r[2] - l[2];
      const bx = u[0] - d[0], by = u[1] - d[1], bz = u[2] - d[2];
      // normal = b × a (points up for +X / +Z grid)
      let nx = by * az - bz * ay;
      let ny = bz * ax - bx * az;
      let nz = bx * ay - by * ax;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      normals.set([nx, ny, nz], k * 3);

      // albedo
      const m = masks[k];
      const x = positions[k * 3];
      const z = positions[k * 3 + 2];
      const slope = 1 - ny;
      // gravel plains vs. lighter sand sheets — large patches that read from the air
      const sheets = smoothstep(-0.25, 0.35, fbm(x * 0.0055 + 7, z * 0.0055, 3));
      const gravel = smoothstep(-0.2, 0.5, fbm(x * 0.02, z * 0.02, 3));
      let c = mix3(GRAVEL, PLAIN, sheets);
      c = mix3(c, GRAVEL, gravel * 0.35);
      c = mix3(c, mix3(DUNE, DUNE_CREST, m.crest), m.nafud);
      const rock = Math.min(1, Math.max(m.aja, m.salma) * 1.6) * smoothstep(0.08, 0.35, slope + 0.1);
      const graniteTone = mix3(GRANITE, GRANITE_WARM, smoothstep(-0.3, 0.6, noise(x * 0.012, z * 0.012)));
      c = mix3(c, graniteTone, rock);
      colors.set(c, k * 3);
    }
  }

  // baked sun shadows: march a low-res height grid towards the sun, keep a soft penumbra
  const G = 192;
  const grid = new Float32Array(G * G);
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      grid[j * G + i] = sampleTerrain((i / (G - 1)) * size - half, (j / (G - 1)) * size - half);
    }
  }
  const heightAt = (x: number, z: number) => {
    const gx = ((x + half) / size) * (G - 1);
    const gz = ((z + half) / size) * (G - 1);
    if (gx < 0 || gz < 0 || gx >= G - 1 || gz >= G - 1) return -1e9;
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const fx = gx - i;
    const fz = gz - j;
    const a = grid[j * G + i] + (grid[j * G + i + 1] - grid[j * G + i]) * fx;
    const b = grid[(j + 1) * G + i] + (grid[(j + 1) * G + i + 1] - grid[(j + 1) * G + i]) * fx;
    return a + (b - a) * fz;
  };
  const horiz = Math.hypot(sun[0], sun[2]) || 1;
  const dx = sun[0] / horiz;
  const dz = sun[2] / horiz;
  const rise = sun[1] / horiz; // height gained per unit of horizontal travel
  const STEP = 7;
  const STEPS = 80;
  for (let k = 0; k < count; k++) {
    const x0 = positions[k * 3];
    const y0 = positions[k * 3 + 1] + 0.6;
    const z0 = positions[k * 3 + 2];
    let occlusion = -Infinity;
    for (let s = 1; s <= STEPS; s++) {
      const d = s * STEP;
      const h = heightAt(x0 + dx * d, z0 + dz * d);
      if (h < -1e8) break;
      occlusion = Math.max(occlusion, (h - (y0 + rise * d)) / (d * 0.08 + 1));
    }
    shadow[k] = 1 - smoothstep(-0.15, 1.8, occlusion);
  }

  const index = new Uint32Array(segments * segments * 6);
  let o = 0;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      index.set([a, c, b, b, c, d], o);
      o += 6;
    }
  }

  return { positions, normals, colors, shadow, index, groundAtPin: sampleTerrain(0, 0) };
}
