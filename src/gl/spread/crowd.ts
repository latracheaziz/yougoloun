import { site } from '@/config/site';

/**
 * WORD OF MOUTH — the data. A crowd of "people" (dots) on the real land of the Arabian Peninsula and
 * around it (sampled from the world land mask), and how a conversation started in Hail reaches each of
 * them: Dijkstra over a nearest-neighbour graph with random delays (so it grows organically, not as a
 * circle), plus cheap long "jump" edges between cities (word of mouth travels between cities first,
 * then spreads around each one). Everything is precomputed; the scene only animates arrival times.
 *
 * World: x east, z south, y up; Hail at the origin; S units per degree of latitude.
 */

export const S = 0.55;
const COS = Math.cos((site.hail.lat * Math.PI) / 180);
export const toWorld = (lat: number, lon: number): [number, number] => [(lon - site.hail.lon) * COS * S, -(lat - site.hail.lat) * S];
/** The window of the map (degrees). */
export const WINDOW = { lon: [30.5, 60] as const, lat: [12, 33.5] as const };

/** Cities: amplifiers of the spread. `label` ones get a name tag (copy: ui.arrival.cities). */
export const CITIES = [
  { key: 'hail', lat: site.hail.lat, lon: site.hail.lon, label: false },
  { key: 'riyadh', lat: 24.7136, lon: 46.6753, label: true },
  { key: 'jeddah', lat: 21.4858, lon: 39.1925, label: true },
  { key: 'kuwait', lat: 29.3759, lon: 47.9774, label: true },
  { key: 'doha', lat: 25.2854, lon: 51.531, label: true },
  { key: 'dubai', lat: 25.2048, lon: 55.2708, label: true },
  { key: 'cairo', lat: 30.0444, lon: 31.2357, label: true },
  { key: 'medina', lat: 24.4672, lon: 39.6024, label: false },
  { key: 'dammam', lat: 26.4207, lon: 50.0888, label: false },
  { key: 'muscat', lat: 23.588, lon: 58.3829, label: false },
  { key: 'amman', lat: 31.9454, lon: 35.9284, label: false },
  { key: 'sanaa', lat: 15.3694, lon: 44.191, label: false },
  { key: 'tabuk', lat: 28.3835, lon: 36.5662, label: false },
  { key: 'abha', lat: 18.2465, lon: 42.5117, label: false },
] as const;
export type CityKey = (typeof CITIES)[number]['key'];

export interface Crowd {
  /** xyz per person (y = 0). */
  positions: Float32Array;
  /** 0..1 — when the conversation reaches each person. */
  arrival: Float32Array;
  /** Random per person. */
  seed: Float32Array;
  /** Tree edges (parent → child), 2 vertices each: xyz + the child's arrival. */
  edges: { positions: Float32Array; arrival: Float32Array };
  /** City-to-city jumps actually taken by the spread: from, to (world xz), start/end arrival. */
  jumps: { from: [number, number]; to: [number, number]; t0: number; t1: number }[];
  /** Index of each city's person + its arrival. */
  cities: Record<CityKey, { index: number; t: number; x: number; z: number }>;
  count: number;
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Min-heap keyed by distance. */
class Heap {
  private k: number[] = [];
  private v: number[] = [];
  get size() {
    return this.k.length;
  }
  push(key: number, val: number) {
    const k = this.k;
    const v = this.v;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): [number, number] {
    const k = this.k;
    const v = this.v;
    const top: [number, number] = [k[0], v[0]];
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length) {
      k[0] = lk;
      v[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

let cache: Promise<Crowd> | null = null;
let cacheStep = 0;

/** Build the crowd (cached). `step` = grid spacing in degrees (smaller = more people). */
export function buildCrowd(step: number): Promise<Crowd> {
  if (cache && cacheStep === step) return cache;
  cacheStep = step;
  cache = new Promise((resolve, reject) => {
    const img = new Image();
    img.src = '/textures/earth/sd/ocean.webp';
    img.decode().then(() => {
      // only the window of the world mask is drawn and read (~1% of the image)
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const x0 = Math.floor(((WINDOW.lon[0] - 1 + 180) / 360) * W);
      const x1 = Math.ceil(((WINDOW.lon[1] + 1 + 180) / 360) * W);
      const y0 = Math.floor(((90 - (WINDOW.lat[1] + 1)) / 180) * H);
      const y1 = Math.ceil(((90 - (WINDOW.lat[0] - 1)) / 180) * H);
      const canvas = document.createElement('canvas');
      canvas.width = x1 - x0;
      canvas.height = y1 - y0;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, x0, y0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const land = (lat: number, lon: number) => {
        const px = Math.min(width - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W) - x0));
        const py = Math.min(height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H) - y0));
        return data[(py * width + px) * 4] <= 110;
      };

      // people: a jittered grid on land
      const rand = rng(2759);
      const pts: number[] = [];
      const ll: number[] = [];
      for (let lat = WINDOW.lat[0]; lat <= WINDOW.lat[1]; lat += step)
        for (let lon = WINDOW.lon[0]; lon <= WINDOW.lon[1]; lon += step / COS) {
          const la = lat + (rand() - 0.5) * step * 0.8;
          const lo = lon + ((rand() - 0.5) * step * 0.8) / COS;
          if (!land(la, lo)) continue;
          const [x, z] = toWorld(la, lo);
          pts.push(x, z);
          ll.push(la, lo);
        }
      const n = pts.length / 2;

      // neighbours via a spatial hash
      const cell = step * S * 1.6;
      const grid = new Map<string, number[]>();
      const keyOf = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
      for (let i = 0; i < n; i++) {
        const k = keyOf(pts[i * 2], pts[i * 2 + 1]);
        (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
      }
      const delay = new Float32Array(n).map(() => 0.8 + rand() * 1.8); // how readily each person passes it on

      // cities → nearest person
      const nearest = (x: number, z: number) => {
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < n; i++) {
          const d = (pts[i * 2] - x) ** 2 + (pts[i * 2 + 1] - z) ** 2;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        return best;
      };
      const cityIdx = CITIES.map((c) => nearest(...toWorld(c.lat, c.lon)));
      const isCity = new Map(cityIdx.map((idx, ci) => [idx, ci]));
      const cityNear = cityIdx.map((ii, ci) =>
        cityIdx
          .map((jj, cj) => ({ cj, d: Math.hypot(pts[jj * 2] - pts[ii * 2], pts[jj * 2 + 1] - pts[ii * 2 + 1]) }))
          .filter((o) => o.cj !== ci)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
          .map((o) => o.cj),
      );

      // Dijkstra from Hail
      const dist = new Float32Array(n).fill(Infinity);
      const parent = new Int32Array(n).fill(-1);
      const jumpEdge = new Uint8Array(n);
      const heap = new Heap();
      dist[cityIdx[0]] = 0;
      heap.push(0, cityIdx[0]);
      while (heap.size) {
        const [d, i] = heap.pop();
        if (d > dist[i]) continue;
        const x = pts[i * 2];
        const z = pts[i * 2 + 1];
        const cx = Math.floor(x / cell);
        const cz = Math.floor(z / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++)
          for (let gz = cz - 1; gz <= cz + 1; gz++) {
            const bucket = grid.get(`${gx},${gz}`);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j === i) continue;
              const w = Math.hypot(pts[j * 2] - x, pts[j * 2 + 1] - z) * delay[j];
              if (d + w < dist[j]) {
                dist[j] = d + w;
                parent[j] = i;
                jumpEdge[j] = 0;
                heap.push(dist[j], j);
              }
            }
          }
        // once a city has been talking for a while, it passes the word to its nearest cities (hops,
        // not a starburst): the conversation travels city to city, then spreads around each one
        const ci = isCity.get(i);
        if (ci !== undefined)
          cityNear[ci].forEach((cj) => {
            const j = cityIdx[cj];
            const w = Math.hypot(pts[j * 2] - x, pts[j * 2 + 1] - z) * 0.5 + 1.1;
            if (d + w < dist[j]) {
              dist[j] = d + w;
              parent[j] = i;
              jumpEdge[j] = 1;
              heap.push(dist[j], j);
            }
          });
      }

      // normalise arrival times (unreached islands get 1)
      let max = 0;
      for (let i = 0; i < n; i++) if (Number.isFinite(dist[i])) max = Math.max(max, dist[i]);
      const arrival = new Float32Array(n);
      for (let i = 0; i < n; i++) arrival[i] = Number.isFinite(dist[i]) ? dist[i] / max : 1;

      const positions = new Float32Array(n * 3);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        positions[i * 3] = pts[i * 2];
        positions[i * 3 + 2] = pts[i * 2 + 1];
        seed[i] = rand();
      }
      // tree edges (local spread only; city jumps are drawn as arcs)
      const ep: number[] = [];
      const ea: number[] = [];
      const jumps: Crowd['jumps'] = [];
      for (let j = 0; j < n; j++) {
        const i = parent[j];
        if (i < 0) continue;
        if (jumpEdge[j]) {
          jumps.push({ from: [pts[i * 2], pts[i * 2 + 1]], to: [pts[j * 2], pts[j * 2 + 1]], t0: arrival[i], t1: arrival[j] });
          continue;
        }
        ep.push(pts[i * 2], 0, pts[i * 2 + 1], pts[j * 2], 0, pts[j * 2 + 1]);
        ea.push(arrival[j], arrival[j]);
      }
      const cities = Object.fromEntries(
        CITIES.map((c, ci) => [c.key, { index: cityIdx[ci], t: arrival[cityIdx[ci]], x: pts[cityIdx[ci] * 2], z: pts[cityIdx[ci] * 2 + 1] }]),
      ) as Crowd['cities'];
      resolve({ positions, arrival, seed, edges: { positions: new Float32Array(ep), arrival: new Float32Array(ea) }, jumps, cities, count: n });
    }, reject);
  });
  return cache;
}
