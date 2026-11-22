import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, UnsignedByteType } from 'three';

/**
 * Tileable normal map of small wind ripples on still water: a sum of travelling-wave shapes with
 * integer frequencies (so it wraps), plus a fine chop. Generated once on the CPU.
 */
let cached: DataTexture | null = null;

export function rippleNormals(size = 128) {
  if (cached) return cached;
  const TAU = Math.PI * 2;
  let s = 4242;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  // integer wave vectors → tileable; skip axis-aligned ones (they read as a grid)
  const waves: { kx: number; ky: number; amp: number; ph: number }[] = [];
  while (waves.length < 28) {
    const k = 3 + rand() * (waves.length < 10 ? 5 : 16);
    const a = rand() * TAU;
    const kx = Math.round(Math.cos(a) * k);
    const ky = Math.round(Math.sin(a) * k);
    if (kx === 0 || ky === 0) continue;
    waves.push({ kx, ky, amp: 1 / Math.pow(Math.hypot(kx, ky), 1.2), ph: rand() * TAU });
  }
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let sum = 0;
      for (const w of waves) {
        sum += w.amp * Math.sin(TAU * (w.kx * u + w.ky * v) + w.ph);
      }
      h[y * size + x] = sum;
    }
  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  const strength = 1.6;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
