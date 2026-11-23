import { BoxGeometry, BufferGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Matrix4, Path, PlaneGeometry, Quaternion, Shape, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Najdi mud architecture (Hail's forts — A'arif, Qishlah, Barzan): battered (tapered) walls and towers,
 * crowned with rows of triangular merlons (shurfat) pierced with a small triangle, triangular vents,
 * wooden doors and water spouts. Built procedurally; static parts are BAKED into merged geometries
 * (one draw call per material). Cached: the canvas may remount.
 */

const cache = new Map<string, BufferGeometry>();
function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined;
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

/** Everything merged must share attributes: non-indexed position / normal / uv. */
const prep = (g: BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.clearGroups();
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k);
  return n;
};

const mtx = new Matrix4();
const q = new Quaternion();
const e = new Euler();
/** A copy of `g`, moved / turned (yaw) / scaled into place. */
export function bake(g: BufferGeometry, pos: [number, number, number], yaw = 0, scale: [number, number, number] = [1, 1, 1]) {
  q.setFromEuler(e.set(0, yaw, 0));
  return prep(g.clone()).applyMatrix4(mtx.compose(new Vector3(...pos), q, new Vector3(...scale)));
}

export const merge = (parts: BufferGeometry[]) => {
  const m = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!m) throw new Error('najdi: merge failed');
  m.computeBoundingSphere();
  return m;
};

// ── pieces ──────────────────────────────────────────────────────────────────────────

/** A merlon: a triangle pierced with a small triangle, 1 wide, 1.1 tall, 1 thick (centred), base at y = 0. */
export function merlon() {
  return cached('merlon', () => {
    const s = new Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0, 1.1);
    s.closePath();
    const hole = new Path();
    hole.moveTo(-0.13, 0.22);
    hole.lineTo(0, 0.5);
    hole.lineTo(0.13, 0.22);
    hole.closePath();
    s.holes.push(hole);
    const g = new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.computeVertexNormals();
    return prep(g);
  });
}

/** A battered (tapered) block, bottom w×d, top scaled by `top`, height h, base at y = 0. Flat-shaded. */
export function batter(w: number, d: number, h: number, top = 0.9) {
  return cached(`batter-${w}-${d}-${h}-${top}`, () => {
    const g = new CylinderGeometry(top * Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, 0.5, 0);
    g.scale(w, h, d);
    const n = g.toNonIndexed();
    n.computeVertexNormals();
    return prep(n);
  });
}

export const box = (w: number, h: number, d: number) => cached(`box-${w}-${h}-${d}`, () => prep(new BoxGeometry(w, h, d)));

/** A flat triangle (vents, gypsum decoration), pointing up, 1 wide / 1 tall, facing +z, base at y = 0. */
export function triangle() {
  return cached('tri', () => {
    const s = new Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0, 1);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
    g.computeVertexNormals();
    return prep(g);
  });
}

// ── crenellations ───────────────────────────────────────────────────────────────────

type Merlons = { size: number; thick: number; spacing?: number };

/** Merlons along a straight wall top from a to b (x, z), at height y; their faces turned across the wall. */
export function merlonsLine(out: BufferGeometry[], a: [number, number], b: [number, number], y: number, { size, thick, spacing = size * 1.35 }: Merlons) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const n = Math.max(1, Math.floor(len / spacing));
  const yaw = Math.atan2(dx, dz) + Math.PI / 2; // local x along the wall
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.push(bake(merlon(), [a[0] + dx * t, y, a[1] + dz * t], yaw, [size, size, thick]));
  }
}

/** Merlons round a circular parapet (lathe convention: x = r·sin φ, z = r·cos φ), skipping a gap at `gapAt`. */
export function merlonsRing(out: BufferGeometry[], r: number, y: number, gapAt: number, gap: number, { size, thick, spacing = size * 1.35 }: Merlons) {
  const span = Math.PI * 2 - gap * 2;
  const n = Math.floor((span * r) / spacing);
  for (let i = 0; i < n; i++) {
    const phi = gapAt + gap + ((i + 0.5) / n) * span;
    out.push(bake(merlon(), [Math.sin(phi) * r, y, Math.cos(phi) * r], phi, [size, size, thick]));
  }
}

/** Merlons round the top of a square tower (side s, centre cx/cz) at height y. */
export function merlonsSquare(out: BufferGeometry[], cx: number, cz: number, s: number, y: number, m: Merlons) {
  const h = s / 2 - m.thick / 2;
  merlonsLine(out, [cx - h, cz + h], [cx + h, cz + h], y, m);
  merlonsLine(out, [cx + h, cz + h], [cx + h, cz - h], y, m);
  merlonsLine(out, [cx + h, cz - h], [cx - h, cz - h], y, m);
  merlonsLine(out, [cx - h, cz - h], [cx - h, cz + h], y, m);
}

// ── the plaza gate towers and the gallery frames ────────────────────────────────────

/**
 * A Najdi gate tower: a battered block (W at the foot, W·0.9 at the top) with a flat-lintel doorway
 * reaching the ground (w × hIn), two triangular vents above it and a crown of merlon teeth on the top
 * edge. Origin at the base centre, front = +z, extruded `depth` (centred).
 */
export function najdiGateGeometry(W: number, H: number, w: number, hIn: number, depth: number, teeth = 6) {
  return cached(`gate-${W}-${H}-${w}-${hIn}-${depth}-${teeth}`, () => {
    const top = W * 0.9;
    const th = 0.62; // tooth height
    const s = new Shape();
    s.moveTo(-W / 2, 0);
    s.lineTo(-w / 2, 0);
    s.lineTo(-w / 2, hIn);
    s.lineTo(w / 2, hIn);
    s.lineTo(w / 2, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(top / 2, H);
    // teeth from right to left, with a little flat between them
    const tw = top / teeth;
    for (let i = teeth - 1; i >= 0; i--) {
      const x0 = -top / 2 + i * tw;
      s.lineTo(x0 + tw * 0.92, H);
      s.lineTo(x0 + tw * 0.5, H + th);
      s.lineTo(x0 + tw * 0.08, H);
    }
    s.lineTo(-top / 2, H);
    s.closePath();
    // triangular vents between the lintel and the crown
    const vy = hIn + (H - hIn) * 0.32;
    const vh = (H - hIn) * 0.38;
    for (const vx of [-0.62, 0, 0.62]) {
      const hole = new Path();
      hole.moveTo(vx - vh * 0.4, vy);
      hole.lineTo(vx, vy + vh);
      hole.lineTo(vx + vh * 0.4, vy);
      hole.closePath();
      s.holes.push(hole);
    }
    const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
  });
}

/** The doorway's glow plane (flat lintel): w × hIn, base at y = 0. */
export const doorGlowGeometry = (w: number, hIn: number) => cached(`doorglow-${w}-${hIn}`, () => new PlaneGeometry(w, hIn).translate(0, hIn / 2, 0));

/** A Najdi gallery frame: a rectangle with a crown of merlon teeth, a rectangular window. Base centre origin. */
export function najdiFrameGeometry(w: number, h: number, t: number, depth: number, teeth = 3) {
  return cached(`nframe-${w}-${h}-${t}-${depth}-${teeth}`, () => {
    const th = 0.34;
    const s = new Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    const tw = w / teeth;
    for (let i = teeth - 1; i >= 0; i--) {
      const x0 = -w / 2 + i * tw;
      s.lineTo(x0 + tw * 0.9, h);
      s.lineTo(x0 + tw * 0.5, h + th);
      s.lineTo(x0 + tw * 0.1, h);
    }
    s.lineTo(-w / 2, h);
    s.closePath();
    const hole = new Path();
    hole.moveTo(-w / 2 + t, t);
    hole.lineTo(-w / 2 + t, h - t);
    hole.lineTo(w / 2 - t, h - t);
    hole.lineTo(w / 2 - t, t);
    hole.closePath();
    s.holes.push(hole);
    const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
  });
}

/** The picture inside a Najdi frame: the window rectangle, UVs 0..1. */
export const framePictureGeometry = (w: number, h: number, t: number) =>
  cached(`npic-${w}-${h}-${t}`, () => new PlaneGeometry(w - 2 * t, h - 2 * t).translate(0, h / 2, 0));
