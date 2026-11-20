import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, UnsignedByteType } from 'three';

let cached: DataTexture | null = null;

/**
 * Tileable value-noise fBm (R = 5 octaves, G = 3 octaves, different seed), generated once on the CPU.
 * Clouds, the cover mask and the speed streaks all sample it instead of computing noise per pixel.
 */
export function noiseTexture(size = 256) {
  if (cached) return cached;

  const lattices = new Map<string, Float32Array>();
  const lattice = (period: number, seed: number) => {
    const key = `${period}:${seed}`;
    let g = lattices.get(key);
    if (!g) {
      g = new Float32Array(period * period);
      let s = seed;
      for (let i = 0; i < g.length; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        g[i] = s / 4294967296;
      }
      lattices.set(key, g);
    }
    return g;
  };

  // smooth value noise on a wrapping lattice → tileable
  const sample = (g: Float32Array, period: number, x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = (x - xi) * (x - xi) * (3 - 2 * (x - xi));
    const v = (y - yi) * (y - yi) * (3 - 2 * (y - yi));
    const at = (a: number, b: number) => g[(b % period) * period + (a % period)];
    const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
    const bottom = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
    return top + (bottom - top) * v;
  };

  const fbm = (x: number, y: number, octaves: number, seed: number) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const period = 4 << o;
      sum += sample(lattice(period, seed + o * 97), period, (x / size) * period, (y / size) * period) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };

  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[i] = Math.round(fbm(x, y, 5, 11) * 255);
      data[i + 1] = Math.round(fbm(x, y, 3, 4021) * 255);
      data[i + 3] = 255;
    }
  }

  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
