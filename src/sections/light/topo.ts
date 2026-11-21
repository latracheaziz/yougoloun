/**
 * Stylised topographic map of the Hail area for the arrival scene (SVG paths, generated once).
 * viewBox 1600×1000, north up, Hail at HAIL. Aja = long granite ridge to the west, Salma = massif to
 * the south-east, Nafud = dune lines to the north. Purely decorative.
 */
export const VIEW = { w: 1600, h: 1000 };
export const HAIL = { x: 820, y: 540 };

/** Deterministic pseudo-random */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
function closedPath(pts: [number, number][]) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

interface Massif {
  cx: number;
  cy: number;
  sx: number;
  sy: number;
  rings: number;
  r0: number;
  step: number;
  seed: number;
  rotate: number;
}

function contours(m: Massif) {
  const rand = rng(m.seed);
  const phases = Array.from({ length: 4 }, () => rand() * Math.PI * 2);
  const out: { d: string; level: number }[] = [];
  for (let k = 0; k < m.rings; k++) {
    const r = m.r0 + k * m.step;
    const amp = 0.08 + k * 0.012;
    const pts: [number, number][] = [];
    const N = 64;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const wobble =
        1 +
        amp * (0.55 * Math.sin(3 * t + phases[0] + k * 0.3) + 0.3 * Math.sin(5 * t + phases[1]) + 0.15 * Math.sin(9 * t + phases[2] - k * 0.2));
      const x = Math.cos(t) * r * m.sx * wobble;
      const y = Math.sin(t) * r * m.sy * wobble;
      const c = Math.cos(m.rotate);
      const s = Math.sin(m.rotate);
      pts.push([m.cx + x * c - y * s, m.cy + x * s + y * c]);
    }
    out.push({ d: closedPath(pts), level: k / (m.rings - 1) });
  }
  return out;
}

export const AJA = contours({ cx: 430, cy: 470, sx: 0.5, sy: 1.35, rings: 11, r0: 26, step: 30, seed: 7, rotate: 0.12 });
export const SALMA = contours({ cx: 1220, cy: 760, sx: 1.05, sy: 0.75, rings: 8, r0: 22, step: 26, seed: 19, rotate: -0.35 });
export const BASIN = contours({ cx: HAIL.x, cy: HAIL.y, sx: 1.2, sy: 0.9, rings: 4, r0: 70, step: 46, seed: 31, rotate: 0 });

/** Nafud dune lines (north). */
export const DUNES = Array.from({ length: 9 }, (_, i) => {
  const y = 40 + i * 24;
  let d = `M-20,${y}`;
  for (let x = 0; x <= 1640; x += 40) {
    const yy = y + Math.sin(x * 0.011 + i * 0.9) * 10 + Math.sin(x * 0.027 + i) * 4;
    d += `L${x},${yy.toFixed(1)}`;
  }
  return d;
});

/** Faint graticule. */
export const GRID = [
  ...Array.from({ length: 9 }, (_, i) => `M${(i + 1) * 160},0V${VIEW.h}`),
  ...Array.from({ length: 5 }, (_, i) => `M0,${(i + 1) * 166}H${VIEW.w}`),
];
