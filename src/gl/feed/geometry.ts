import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { token, type Token } from '../palette';

/**
 * Geometry for the social-media world, built procedurally (no model files):
 * extruded 2D shapes with soft bevels read as glossy "3D icon" objects.
 * Everything is cached — the canvas can unmount and remount without rebuilding.
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

const extrude = (shape: Shape, depth: number, bevel: number, curveSegments = 40, bevelSegments = 8) => {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments, curveSegments });
  g.center();
  g.computeVertexNormals();
  return g;
};

/**
 * Bake a diagonal gradient (light top-left → deep bottom-right, like the logo) into vertex colours.
 * Used with glossy(…, { gradient: true }) (vertexColors).
 */
function gradient<T extends BufferGeometry>(g: T, from: Token, to: Token): T {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const pos = g.attributes.position;
  const a = token(from);
  const z = token(to);
  const c = new Color();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x || 1);
    const v = (b.max.y - pos.getY(i)) / (b.max.y - b.min.y || 1);
    c.copy(a).lerp(z, Math.min(1, Math.max(0, u * 0.45 + v * 0.75 - 0.1)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
}

/** Speech bubble outline: rounded rectangle with a tail at the bottom (-1 = left, 1 = right). */
export function bubbleShape(w: number, h: number, r: number, tail: 1 | -1) {
  const s = new Shape();
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = -h / 2;
  const y1 = h / 2;
  const drop = h * 0.34;
  s.moveTo(x0 + r, y0);
  if (tail < 0) {
    s.lineTo(x0 + w * 0.3, y0);
    s.lineTo(x0 + w * 0.06, y0 - drop);
    s.lineTo(x0 + w * 0.5, y0);
  } else {
    s.lineTo(x1 - w * 0.5, y0);
    s.lineTo(x1 - w * 0.06, y0 - drop);
    s.lineTo(x1 - w * 0.3, y0);
  }
  s.lineTo(x1 - r, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/** The logo's bubbles (blue front-left, green behind-right) and the small comment bubble. */
export const geo = {
  bubbleBlue: () => cached('bubbleBlue', () => gradient(extrude(bubbleShape(1.3, 1.0, 0.3, -1), 0.26, 0.09, 64, 12), 'blue', 'blueDeep')),
  bubbleGreen: () => cached('bubbleGreen', () => gradient(extrude(bubbleShape(1.12, 0.86, 0.26, 1), 0.22, 0.08, 64, 12), 'green', 'greenDeep')),
  comment: () => cached('comment', () => extrude(bubbleShape(0.5, 0.38, 0.13, -1), 0.1, 0.045)),
  miniBubble: () => cached('miniBubble', () => extrude(bubbleShape(0.24, 0.18, 0.07, -1), 0.05, 0.025, 10)),

  heart: () =>
    cached('heart', () => {
      const s = new Shape();
      s.moveTo(0, 0.22);
      s.bezierCurveTo(0, 0.42, -0.24, 0.52, -0.4, 0.4);
      s.bezierCurveTo(-0.6, 0.25, -0.54, -0.02, -0.36, -0.18);
      s.quadraticCurveTo(-0.16, -0.36, 0, -0.52);
      s.quadraticCurveTo(0.16, -0.36, 0.36, -0.18);
      s.bezierCurveTo(0.54, -0.02, 0.6, 0.25, 0.4, 0.4);
      s.bezierCurveTo(0.24, 0.52, 0, 0.42, 0, 0.22);
      return extrude(s, 0.14, 0.07, 56, 10);
    }),

  /** Heart with the brand gradient baked in (blue → green). */
  heartGradient: () => cached('heartGradient', () => gradient(geo.heart().clone(), 'blueLight', 'green')),

  /** Growth arrow (up-right). */
  arrow: () =>
    cached('arrow', () => {
      const s = new Shape();
      const pts: [number, number][] = [
        [-0.09, -0.55], [0.09, -0.55], [0.09, 0.12], [0.26, 0.12], [0, 0.55], [-0.26, 0.12], [-0.09, 0.12],
      ];
      s.moveTo(...pts[0]);
      pts.slice(1).forEach((p) => s.lineTo(...p));
      s.closePath();
      return extrude(s, 0.12, 0.05);
    }),

  /** Rounded play triangle. */
  play: () =>
    cached('play', () => {
      const s = new Shape();
      s.moveTo(-0.12, 0.17);
      s.quadraticCurveTo(-0.15, 0.2, -0.12, 0.2);
      s.lineTo(-0.12, -0.17);
      s.quadraticCurveTo(-0.12, -0.2, -0.09, -0.19);
      s.lineTo(0.2, -0.02);
      s.quadraticCurveTo(0.23, 0, 0.2, 0.02);
      s.lineTo(-0.09, 0.19);
      s.closePath();
      return extrude(s, 0.05, 0.025);
    }),

  /** Megaphone body: a hollow flared horn around +Y. */
  megaphone: () =>
    cached('megaphone', () => {
      const pts = [
        [0.07, -0.32], [0.1, -0.3], [0.12, -0.12], [0.2, 0.1], [0.32, 0.3], [0.36, 0.34],
        [0.35, 0.37], [0.31, 0.36], [0.2, 0.18], [0.1, -0.06], [0.08, -0.26], [0.05, -0.32],
      ].map(([x, y]) => new Vector2(x, y));
      const g = new LatheGeometry(pts, 96);
      g.computeVertexNormals();
      return g;
    }),

  /** Notification bell. */
  bell: () =>
    cached('bell', () => {
      const pts = [
        [0, 0.34], [0.05, 0.33], [0.06, 0.29], [0.13, 0.25], [0.18, 0.14], [0.2, -0.02], [0.24, -0.14],
        [0.3, -0.2], [0.3, -0.24], [0, -0.24],
      ].map(([x, y]) => new Vector2(x, y));
      const g = new LatheGeometry(pts, 96);
      g.computeVertexNormals();
      return g;
    }),

  /** "#" — two horizontal and two slanted vertical bars. */
  hashBar: () => cached('hashBar', () => new RoundedBoxGeometry(0.62, 0.11, 0.11, 6, 0.05)),

  phoneBody: () => cached('phoneBody', () => new RoundedBoxGeometry(0.64, 1.3, 0.07, 8, 0.035)),
  /** Rounded screen with 0..1 UVs (ShapeGeometry UVs are in shape units, remapped here). */
  phoneScreen: () =>
    cached('phoneScreen', () => {
      const w = 0.58;
      const h = 1.24;
      const r = 0.07;
      const s = new Shape();
      s.moveTo(-w / 2 + r, -h / 2);
      s.lineTo(w / 2 - r, -h / 2);
      s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r);
      s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r);
      s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      const g = new ShapeGeometry(s, 8);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
      return g;
    }),
  notch: () => cached('notch', () => new RoundedBoxGeometry(0.2, 0.05, 0.01, 2, 0.02)),

  bar: (h: number) => cached(`bar${h}`, () => new RoundedBoxGeometry(0.16, h, 0.16, 6, 0.04)),
  camBody: () => cached('camBody', () => new RoundedBoxGeometry(0.78, 0.52, 0.34, 8, 0.08)),
  camTop: () => cached('camTop', () => new RoundedBoxGeometry(0.26, 0.12, 0.22, 6, 0.04)),
  cylinder: (r: number, h: number) => cached(`cyl${r}-${h}`, () => new CylinderGeometry(r, r, h, 64, 1)),
  sphere: (r: number) => cached(`sph${r}`, () => new SphereGeometry(r, 48, 24)),
  torus: (r: number, t: number) => cached(`tor${r}-${t}`, () => new TorusGeometry(r, t, 32, 128)),
  /** Thin orbit ring for the cornerstones. */
  orbit: () => cached('orbit', () => new TorusGeometry(1.5, 0.006, 6, 160)),
  /** Mic for the logo bubble: capsule + stand. */
  micHead: () => cached('micHead', () => new RoundedBoxGeometry(0.16, 0.3, 0.12, 8, 0.06)),
  micArc: () => cached('micArc', () => new TorusGeometry(0.14, 0.018, 16, 64, Math.PI)),
  micWave: (h: number) => cached(`wave${h}`, () => new RoundedBoxGeometry(0.035, h, 0.03, 2, 0.015)),
};
