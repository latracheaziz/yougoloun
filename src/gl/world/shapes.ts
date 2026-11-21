import { BufferGeometry, ExtrudeGeometry, Path, Shape, ShapeGeometry } from 'three';
import { bubbleShape, gradient } from '../props/geometry';
import { PORTAL } from './layout';

/**
 * Architecture outlines, extruded with soft bevels. Cached (the canvas may remount).
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

const extrude = (shape: Shape, depth: number, bevel: number, curveSegments = 48, bevelSegments = 6, center = true) => {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments, curveSegments });
  if (center) {
    g.computeBoundingBox();
    g.translate(0, 0, -depth / 2);
  }
  g.computeVertexNormals();
  return g;
};

/** Rounded rectangle path (for holes). Clockwise, as holes must run opposite to the outline. */
function roundedRectHole(w: number, h: number, r: number, cy = 0) {
  const p = new Path();
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  p.moveTo(x0 + r, y0);
  p.quadraticCurveTo(x0, y0, x0, y0 + r);
  p.lineTo(x0, y1 - r);
  p.quadraticCurveTo(x0, y1, x0 + r, y1);
  p.lineTo(x1 - r, y1);
  p.quadraticCurveTo(x1, y1, x1, y1 - r);
  p.lineTo(x1, y0 + r);
  p.quadraticCurveTo(x1, y0, x1 - r, y0);
  p.closePath();
  return p;
}

/** Speech-bubble portal: the logo's bubble as a doorway (window cut through), with the logo gradient. */
export function portalGeometry(kind: 'blue' | 'green') {
  return cached(`portal-${kind}`, () => {
    const k = kind === 'blue' ? 1 : 0.84;
    const w = PORTAL.w * k;
    const h = PORTAL.h * k;
    const s = bubbleShape(w, h, PORTAL.r * k, kind === 'blue' ? -1 : 1);
    s.holes.push(roundedRectHole(w - PORTAL.inset * 2 * k, h - PORTAL.inset * 2 * k, (PORTAL.r - PORTAL.inset * 0.55) * k));
    const g = extrude(s, PORTAL.depth * k, 0.12 * k, 72, 10);
    return kind === 'blue' ? gradient(g, 'blue', 'blueDeep') : gradient(g, 'green', 'greenDeep');
  });
}

/** Doorway arch: a block with a round-topped opening reaching the ground. Origin at the base centre. */
export function doorwayGeometry(W: number, H: number, w: number, hIn: number, depth: number) {
  return cached(`door-${W}-${H}-${w}-${hIn}-${depth}`, () => {
    const s = new Shape();
    const r = w / 2;
    s.moveTo(-W / 2, 0);
    s.lineTo(-r, 0);
    s.lineTo(-r, hIn - r);
    s.absarc(0, hIn - r, r, Math.PI, 0, true);
    s.lineTo(r, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(W / 2, H);
    s.lineTo(-W / 2, H);
    s.closePath();
    return extrude(s, depth, 0.04, 64, 3);
  });
}

/** Round-topped arch outline (gallery frames + their pictures). Origin at the base centre. */
function archShape(w: number, h: number, inset = 0) {
  const s = new Shape();
  const r = w / 2 - inset;
  const x = w / 2 - inset;
  s.moveTo(-x, inset);
  s.lineTo(x, inset);
  s.lineTo(x, h - w / 2);
  s.absarc(0, h - w / 2, r, 0, Math.PI, false);
  s.closePath();
  return s;
}

/** Gallery frame: an arch with an arch-shaped window (the picture sits inside). */
export function archFrameGeometry(w: number, h: number, t: number, depth: number) {
  return cached(`frame-${w}-${h}-${t}-${depth}`, () => {
    const s = archShape(w, h);
    const hole = new Path();
    const r = w / 2 - t;
    hole.moveTo(-r, t);
    hole.lineTo(-r, h - w / 2);
    hole.absarc(0, h - w / 2, r, Math.PI, 0, true);
    hole.lineTo(r, t);
    hole.closePath();
    s.holes.push(hole);
    return extrude(s, depth, 0.03, 64, 3);
  });
}

/** The picture inside a gallery frame, UVs 0..1 across its bounding box. */
export function archPictureGeometry(w: number, h: number, t: number) {
  return cached(`picture-${w}-${h}-${t}`, () => {
    const g = new ShapeGeometry(archShape(w, h, t), 48);
    const uv = g.attributes.uv;
    const pw = w - 2 * t;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + pw / 2) / pw, (uv.getY(i) - t) / (h - 2 * t));
    return g;
  });
}
