import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type PerspectiveCamera, Vector3 } from 'three';
import { dive, world } from './state';
import { bindPointer, pointer } from './pointer';
import { hold, look as drag } from '@/interaction/hold';
import { planets } from './world/Planets';
import { CLOUD_PEAK_DEPTH } from './dive/Dive';
import { ORB } from './world/layout';
import { journey, sectionIds, sectionIndex } from '@/scroll/journey';
import { rangeProgress, sectionConfig, type SectionId } from '@/config/timeline';
import { useApp } from '@/store/app';

/**
 * THE DIRECTOR — turns scroll progress into a camera walk through the world, every frame.
 *
 * Everything is a pure function of the scroll position (scroll back up and you walk back);
 * only the layout side (RTL), the aspect blend and the pointer look-around are damped.
 *
 * Story coordinate G = sectionIndex + local progress:
 *   Chapter 1  the speech-bubble portal on its mirror pool (hero)
 *   Chapter 2  through the portal, down the walkway of arch frames (about)
 *   Chapter 3  the plaza: four arches light up one by one, the ribbon wraps the orb (cornerstones)
 *   Chapter 4  into the orb and the clouds → total white-out → the paper of the light site
 *
 * Framing: a lens shift (camera.setViewOffset) puts the subject beside the text — towards the end
 * side in landscape (mirrored in RTL), below/above it in portrait.
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
// pos / look: camera and target (m) · shift: lens shift, fraction of the width (landscape, towards
// the end side) · shiftP: portrait, fraction of the height (+ = subject lower) · backP: portrait
// pull-back along the view (m) · fov: vertical, degrees
interface Shot {
  pos: Vector3;
  look: Vector3;
  shift: number;
  shiftP: number;
  backP: number;
  fov: number;
}
const shot = (pos: [number, number, number], look: [number, number, number], shift: number, shiftP: number, backP: number, fov: number): Shot => ({
  pos: new Vector3(...pos),
  look: new Vector3(...look),
  shift,
  shiftP,
  backP,
  fov,
});

const HERO_A = shot([0, 2.4, 13.5], [0, 2.95, 0], 0.2, 0.27, 9.5, 36);
const HERO_B = shot([0, 2.5, 11.8], [0, 2.9, 0], 0.18, 0.25, 8, 37);
const THROUGH = shot([0, 2.85, -0.8], [0, 2.55, -12], 0.14, -0.12, 0, 42);
const WALK_END = shot([0.7, 2.3, -15.5], [0, 2.1, -27], 0.16, -0.14, 2, 42);
const PLAZA_VIEW = shot([0, 4.9, -23.5], [0, 2.5, -36], 0.17, -0.28, 5, 40);
const PLAZA_SIDE = shot([2.4, 5.8, -24.2], [0, 2.8, -37], 0.17, -0.28, 5, 40);
const PLAZA_MEET = shot([3.6, 5.2, -26.6], [0, 3.1, -37], 0.15, -0.28, 5, 40);
const DIVE_START = shot([1.6, 4.4, -27.6], [ORB.center.x, ORB.center.y, ORB.center.z], 0, 0, 3, 38);

const KEYS: [number, Shot][] = [
  [g('home', 0), HERO_A],
  [g('home', K.home.toAbout[0]), HERO_B],
  [g('about', K.about.fan[1]), THROUGH],
  [g('about', 1), WALK_END],
  [g('cornerstones', 0.1), PLAZA_VIEW],
  [g('cornerstones', K.cornerstones.intersect[0]), PLAZA_SIDE],
  [g('cornerstones', K.cornerstones.intersect[1]), PLAZA_MEET],
  [g('cornerstones', 1), PLAZA_MEET],
  [g('positioning', 0.12), DIVE_START],
  [g('positioning', 1), DIVE_START], // the fall itself is procedural (diveShot)
];

const out: Shot = shot([0, 0, 0], [0, 0, 0], 0, 0, 0, 36);
function sample(G: number) {
  let k = 0;
  while (k < KEYS.length - 1 && KEYS[k + 1][0] <= G) k++;
  const [g0, a] = KEYS[k];
  const next = KEYS[k + 1];
  const t = next && G > g0 ? smootherstep(G, g0, next[0]) : 0;
  const b = next ? next[1] : a;
  out.pos.copy(a.pos).lerp(b.pos, t);
  out.look.copy(a.look).lerp(b.look, t);
  out.shift = lerp(a.shift, b.shift, t);
  out.shiftP = lerp(a.shiftP, b.shiftP, t);
  out.backP = lerp(a.backP, b.backP, t);
  out.fov = lerp(a.fov, b.fov, t);
  return out;
}

/** The dive: from the lined-up shot straight into the orb, accelerating into the clouds. */
const toOrb = new Vector3();
function diveShot(p: number, reduced: boolean) {
  const s = reduced ? 0 : clamp(p / COVER, 0, 1);
  const result = sample(g('positioning', reduced ? 0 : p));
  const fall = 1 - Math.pow(1 - s, 2.4);
  toOrb.copy(result.pos).sub(ORB.center).normalize().multiplyScalar(ORB.radius + 0.35).add(ORB.center);
  result.pos.lerp(toOrb, fall);
  result.backP *= 1 - fall;
  result.fov = lerp(result.fov, 58, Math.pow(s, 1.4));
  return result;
}

const UP = new Vector3(0, 1, 0);
const view = new Vector3();
const smooth = { side: 1, land: 1, px: 0, py: 0, yaw: 0, pitch: 0, init: false };
const focusPos = new Vector3();
const focusDir = new Vector3();

export function Director() {
  useEffect(() => bindPointer(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const camera = state.camera as PerspectiveCamera;
    const { size, clock } = state;
    const { reducedMotion: reduced, dir } = useApp.getState();
    const time = clock.elapsedTime;

    // damped layout params + pointer
    const sideTarget = dir === 'rtl' ? -1 : 1;
    const landTarget = smoothstep(size.width / size.height, 0.75, 1.35);
    if (!smooth.init) Object.assign(smooth, { side: sideTarget, land: landTarget, init: true });
    smooth.side = damp(smooth.side, sideTarget, 2.6, dt);
    smooth.land = damp(smooth.land, landTarget, 4, dt);
    smooth.px = damp(smooth.px, reduced ? 0 : pointer.x, 2.2, dt);
    smooth.py = damp(smooth.py, reduced ? 0 : pointer.y, 2.2, dt);
    const { side, land } = smooth;
    world.side = side;
    world.land = land;
    world.pointer.set(smooth.px, smooth.py);
    if (!reduced) world.ribbon += clamp(Math.abs(journey.velocity) * 0.004, 0, 0.08);

    // where are we in the story?
    const idx = journey.index;
    const id = sectionIds[idx];
    const p = journey.p[idx];
    const G = idx + p;
    world.G = G;

    const s = id === 'positioning' ? diveShot(p, reduced) : sample(G);

    // portrait: pull back along the view so the subject fits the narrow frame
    // x is mirrored with the layout side (the world is laid out for LTR: text on the left)
    s.pos.x *= side;
    s.look.x *= side;
    // a cornerstone planet in focus: fly in close, from the side the camera is already on
    if (world.focusW > 0.001) {
      const w = world.focusW * world.focusW * (3 - 2 * world.focusW);
      const P = planets[world.focusIndex];
      // from outside the orbit (the orb glows behind the planet), leaning towards the side we're on
      focusDir.copy(P).sub(ORB.center).setY(0).normalize().multiplyScalar(0.7);
      focusDir.add(view.copy(s.pos).sub(P).setY(0).normalize().multiplyScalar(0.3)).normalize();
      focusPos.copy(P).addScaledVector(focusDir, 4.2);
      focusPos.y += 0.9;
      s.pos.lerp(focusPos, w);
      s.look.lerp(P, w);
      s.shift = lerp(s.shift, -0.13, w); // planet on the start side (the chapter text fades out), the card on the end side
      s.shiftP = lerp(s.shiftP, -0.2, w); // portrait: planet in the upper half, the card below
      s.backP = lerp(s.backP, 1.5, w);
      s.fov = lerp(s.fov, 36, w);
    }
    view.copy(s.look).sub(s.pos).normalize();
    camera.position.copy(s.pos).addScaledVector(view, -s.backP * (1 - land));
    camera.up.copy(UP);
    camera.lookAt(s.look);

    // look around with the pointer (less while diving)
    const look = id === 'positioning' ? 1 - smoothstep(p, 0, 0.2) : 1;
    camera.rotateY(-smooth.px * 0.045 * look);
    camera.rotateX(smooth.py * 0.028 * look);
    // drag to look around (springs back on release)
    smooth.yaw = damp(smooth.yaw, drag.dragging ? drag.yaw : 0, drag.dragging ? 6 : 2.4, dt);
    smooth.pitch = damp(smooth.pitch, drag.dragging ? drag.pitch : 0, drag.dragging ? 6 : 2.4, dt);
    camera.rotateY(smooth.yaw * look);
    camera.rotateX(smooth.pitch * look);

    // story elements
    world.reveal.fill(0);
    world.meet = 0;
    if (id === 'cornerstones') {
      K.cornerstones.rings.forEach((r, i) => (world.reveal[i] = rangeProgress(p, r)));
      world.meet = rangeProgress(p, K.cornerstones.intersect);
    } else if (id === 'positioning') {
      world.reveal.fill(1);
      world.meet = 1;
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
      streaks = reduced ? 0 : bell(p, 0.15, 0.45, COVER) * 0.7;
      shake = reduced ? 0 : bell(p, 0.25, 0.48, COVER) * 0.0024;
    }
    Object.assign(dive, { cover, clouds, cloudTravel: travel, streaks, shake });
    // the voice speaks: a short kick
    if (!reduced && hold.burstAt >= 0) shake = Math.max(shake, Math.exp(-(time - hold.burstAt) * 5) * 0.004);

    if (shake > 0) {
      camera.rotateX(Math.sin(time * 23.1) * Math.sin(time * 7.3) * shake);
      camera.rotateY(Math.sin(time * 19.7 + 1.3) * Math.sin(time * 5.1) * shake);
    }

    // lens shift: landscape → towards the end side; portrait → down (hero) / up (later chapters)
    const W = size.width;
    const H = size.height;
    const offX = -s.shift * side * W * land;
    const offY = -s.shiftP * H * (1 - land);
    // hold to awaken: the camera leans in as the voice charges
    const lean = reduced ? 0 : world.charge * world.charge * 2.2;
    setProjection(camera, s.fov + (1 - land) * 8 - lean, W, H, offX, offY);
  });

  return null;
}

function setProjection(camera: PerspectiveCamera, fov: number, W: number, H: number, offX: number, offY: number) {
  camera.fov = fov;
  camera.near = 0.05;
  camera.far = 900;
  if (W > 0 && H > 0) camera.setViewOffset(W, H, offX, offY, W, H);
  camera.updateProjectionMatrix();
}
