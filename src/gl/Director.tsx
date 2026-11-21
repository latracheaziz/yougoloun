import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type PerspectiveCamera, Vector3 } from 'three';
import { dive, feed } from './state';
import { bindPointer, pointer } from './pointer';
import { CLOUD_PEAK_DEPTH } from './dive/Dive';
import { journey, sectionIds, sectionIndex } from '@/scroll/journey';
import { rangeProgress, sectionConfig, type SectionId } from '@/config/timeline';
import { useApp } from '@/store/app';

/**
 * THE DIRECTOR — turns scroll progress into camera shots and world state, every frame.
 *
 * Everything is a pure function of the scroll position (no lag, no drift); only the layout
 * side (RTL mirror), the aspect blend and the pointer are damped.
 *
 * Story coordinate G = sectionIndex + local progress:
 *   hero (logo + icons) → about (phones fan out, comments fly into the logo) → cornerstones
 *   (four objects on orbits that merge) → DIVE into the logo and the clouds → total white-out,
 *   which becomes the paper background of the light site.
 */

const { damp, lerp, smoothstep, smootherstep, clamp } = MathUtils;

const K = {
  home: sectionConfig('home').keys,
  about: sectionConfig('about').keys,
  cornerstones: sectionConfig('cornerstones').keys,
  positioning: sectionConfig('positioning').keys,
};
const COVER = K.positioning.cover;
const g = (id: SectionId, p: number) => sectionIndex[id] + p;

/** 0 → 1 → 0 over [a, m, b]. */
const bell = (x: number, a: number, m: number, b: number) => (x < m ? smoothstep(x, a, m) : 1 - smoothstep(x, m, b));

// ── SHOTS ────────────────────────────────────────────────────────────────────────────
// ex/ey: subject offset (landscape; ex is mirrored in RTL) · exP/eyP: portrait
// camZ / camZP: camera distance (landscape / portrait)
interface Shot {
  ex: number;
  ey: number;
  exP: number;
  eyP: number;
  camZ: number;
  camZP: number;
  fov: number;
}
const HERO: Shot = { ex: 1.6, ey: -0.05, exP: 0, eyP: -2.3, camZ: 6.1, camZP: 9.6, fov: 35 };
const ABOUT: Shot = { ex: 1.5, ey: 0.2, exP: 0, eyP: 1.35, camZ: 6.8, camZP: 10.2, fov: 35 };
const ABOUT_HOLD: Shot = { ...ABOUT, camZ: 6.5, camZP: 9.8 };
const CORNER: Shot = { ex: 1.55, ey: 0.2, exP: 0, eyP: 2.9, camZ: 8.0, camZP: 12.6, fov: 35 };
const CORNER_MEET: Shot = { ex: 1.35, ey: 0.15, exP: 0, eyP: 2.7, camZ: 7.2, camZP: 11.8, fov: 35 };
const DIVE_START: Shot = { ex: 0, ey: 0, exP: 0, eyP: 0, camZ: 5.8, camZP: 8.2, fov: 35 };
const DIVE_END_Z = 0.95; // just in front of the logo — the clouds cover everything by then

const KEYS: [number, Shot][] = [
  [g('home', 0), HERO],
  [g('home', K.home.toAbout[0]), HERO],
  [g('about', K.about.fan[1]), ABOUT],
  [g('about', 1), ABOUT_HOLD],
  [g('cornerstones', 0.1), CORNER],
  [g('cornerstones', K.cornerstones.intersect[0]), CORNER],
  [g('cornerstones', K.cornerstones.intersect[1]), CORNER_MEET],
  [g('cornerstones', 1), CORNER_MEET],
  [g('positioning', 0.12), DIVE_START],
  [g('positioning', 1), DIVE_START], // the fall itself is procedural (diveShot)
];

const SHOT_KEYS = ['ex', 'ey', 'exP', 'eyP', 'camZ', 'camZP', 'fov'] as const;
const out: Shot = { ...HERO };
function sample(G: number) {
  let k = 0;
  while (k < KEYS.length - 1 && KEYS[k + 1][0] <= G) k++;
  const [g0, a] = KEYS[k];
  const next = KEYS[k + 1];
  const t = next && G > g0 ? smootherstep(G, g0, next[0]) : 0;
  const b = next ? next[1] : a;
  for (const key of SHOT_KEYS) out[key] = lerp(a[key], b[key], t);
  return out;
}

/** The dive: from the lined-up shot into the logo, accelerating into the clouds. */
function diveShot(p: number, reduced: boolean) {
  const s = reduced ? 0 : clamp(p / COVER, 0, 1);
  const result = sample(g('positioning', reduced ? 0 : p));
  const fall = Math.pow(1 - s, 2.2);
  result.camZ = DIVE_END_Z + (result.camZ - DIVE_END_Z) * fall;
  result.camZP = DIVE_END_Z + (result.camZP - DIVE_END_Z) * fall;
  result.fov = lerp(35, 52, Math.pow(s, 1.3));
  return result;
}

/** Formation weights from the story coordinate. */
const HA = [g('home', K.home.toAbout[0]), g('about', K.about.fan[1])] as const;
const AC = [g('about', 0.82), g('cornerstones', 0.08)] as const;
const CD = [g('cornerstones', 0.97), g('positioning', 0.12)] as const;
function weights(G: number) {
  const ha = smootherstep(G, HA[0], HA[1]);
  const ac = smootherstep(G, AC[0], AC[1]);
  const cd = smootherstep(G, CD[0], CD[1]);
  feed.w.hero = 1 - ha;
  feed.w.about = ha * (1 - ac);
  feed.w.corner = ac * (1 - cd);
  feed.w.dive = cd;
}

const UP = new Vector3(0, 1, 0);
const smooth = { side: 1, land: 1, px: 0, py: 0, init: false };

export function Director() {
  useEffect(() => bindPointer(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const camera = state.camera as PerspectiveCamera;
    const { size, clock } = state;
    const { reducedMotion: reduced, dir } = useApp.getState();
    const time = clock.elapsedTime;

    // damped layout params
    const sideTarget = dir === 'rtl' ? -1 : 1;
    const landTarget = smoothstep(size.width / size.height, 0.75, 1.35);
    if (!smooth.init) Object.assign(smooth, { side: sideTarget, land: landTarget, init: true });
    smooth.side = damp(smooth.side, sideTarget, 2.6, dt);
    smooth.land = damp(smooth.land, landTarget, 4, dt);
    smooth.px = damp(smooth.px, reduced ? 0 : pointer.x, 3, dt);
    smooth.py = damp(smooth.py, reduced ? 0 : pointer.y, 3, dt);
    const { side, land } = smooth;
    feed.side = side;
    feed.land = land;
    feed.pointer.set(smooth.px, smooth.py);
    feed.pointerRaw.set(pointer.active ? pointer.x : -9, pointer.active ? pointer.y : -9);
    feed.velocity = damp(feed.velocity, reduced ? 0 : journey.velocity, 4, dt);

    // where are we in the story?
    const idx = journey.index;
    const id = sectionIds[idx];
    const p = journey.p[idx];
    const G = idx + p;
    feed.G = G;
    weights(G);

    const s = id === 'positioning' ? diveShot(p, reduced) : sample(G);
    const ex = lerp(s.exP, s.ex * side, land);
    const ey = lerp(s.eyP, s.ey, land);
    const camZ = lerp(s.camZP, s.camZ, land);
    feed.anchor.set(ex, ey, 0);

    const parallax = id === 'positioning' ? 1 - smoothstep(p, 0, 0.15) : 1;
    camera.position.set(smooth.px * 0.12 * parallax, smooth.py * 0.08 * parallax, camZ);
    camera.up.copy(UP);
    camera.lookAt(0, 0, 0);

    // story elements
    feed.reveal.fill(0);
    feed.meet = 0;
    feed.chatter = 0;
    switch (id) {
      case 'about':
        feed.chatter = smoothstep(rangeProgress(p, K.about.chatter), 0, 0.3);
        break;
      case 'cornerstones':
        feed.chatter = 1 - smoothstep(p, 0, 0.12);
        K.cornerstones.rings.forEach((r, i) => (feed.reveal[i] = rangeProgress(p, r)));
        feed.meet = rangeProgress(p, K.cornerstones.intersect);
        break;
      case 'positioning':
        feed.reveal.fill(1);
        feed.meet = 1;
        break;
    }

    // ── the dive: clouds, cover (stays total once reached), streaks, shake ─────────
    let cover = 0;
    let clouds = 0;
    let travel = 0;
    let streaks = 0;
    let shake = 0;
    if (id === 'positioning') {
      cover = smoothstep(p, COVER - (reduced ? 0.12 : 0.16), COVER);
      travel = lerp(0, CLOUD_PEAK_DEPTH, rangeProgress(p, [0.16, COVER]));
      clouds = reduced ? 0 : smoothstep(p, 0.12, 0.3);
      streaks = reduced ? 0 : bell(p, 0.15, 0.45, COVER) * 0.9;
      shake = reduced ? 0 : bell(p, 0.25, 0.48, COVER) * 0.0032;
    }
    Object.assign(dive, { cover, clouds, cloudTravel: travel, streaks, shake });

    if (shake > 0) {
      camera.rotateX(Math.sin(time * 23.1) * Math.sin(time * 7.3) * shake);
      camera.rotateY(Math.sin(time * 19.7 + 1.3) * Math.sin(time * 5.1) * shake);
      camera.rotateZ(Math.sin(time * 11.9 + 2.1) * shake * 0.6);
    }

    setProjection(camera, s.fov + (1 - land) * 6, 0.01, 900);
  });

  return null;
}

function setProjection(camera: PerspectiveCamera, fov: number, near: number, far: number) {
  if (camera.fov !== fov || camera.near !== near || camera.far !== far) {
    camera.fov = fov;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
  }
}
