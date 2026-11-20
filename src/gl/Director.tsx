import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type PerspectiveCamera, Vector3 } from 'three';
import { dive, space } from './state';
import { spinToFace } from './geo';
import { bindPointer, pointer } from './pointer';
import { CLOUD_PEAK_DEPTH } from './dive/Dive';
import { journey, sectionIds, sectionIndex } from '@/scroll/journey';
import { rangeProgress, sectionConfig, type SectionId } from '@/config/timeline';
import { useApp } from '@/store/app';

/**
 * THE DIRECTOR — turns scroll progress into camera shots and world state, every frame.
 *
 * Everything is a pure function of the scroll position (no lag, no drift); only the layout
 * side (RTL mirror) and the aspect blend are damped so language/resize changes glide.
 *
 * Story coordinate G = sectionIndex + local progress. Shots are keyframed on G:
 *   hero → Gulf (arcs, words) → rings → rings meet above Hail → line up → DIVE into the clouds
 *   → total white-out, which becomes the paper background of the light site.
 */

const { damp, lerp, smoothstep, smootherstep, clamp } = MathUtils;
const DEG = Math.PI / 180;

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
// ex/ey: planet offset on screen (landscape; ex is mirrored in RTL) · exP/eyP: portrait
// camZ / camZP: camera distance · lat/lon: point of the globe facing the camera
// lonSide: longitude offset × layout side (keeps the subject towards the screen centre)
// sunMirror: 1 = the sun follows the layout mirror (hero), 0 = geographic sun
interface Shot {
  ex: number;
  ey: number;
  exP: number;
  eyP: number;
  camZ: number;
  camZP: number;
  lat: number;
  lon: number;
  lonSide: number;
  roll: number;
  sun: Vector3;
  sunMirror: number;
  fov: number;
}
type ShotInput = Omit<Shot, 'sun' | 'lonSide'> & { sun: [number, number, number]; lonSide?: number };
const shot = (o: ShotInput): Shot => ({ lonSide: 0, ...o, sun: new Vector3(...o.sun).normalize() });
const variant = (base: Shot, o: Partial<Shot>): Shot => ({ ...base, ...o, sun: (o.sun ?? base.sun).clone() });

const HERO = shot({ ex: 1.08, ey: -0.3, exP: 0, eyP: -1.6, camZ: 3.6, camZP: 4.4, lat: 24, lon: 30, roll: -0.16, sun: [-0.78, 0.58, -0.5], sunMirror: 1, fov: 35 });
// Golden hour over Hail, seen from the south at 3/4: the planet fills the frame low, Hail near its
// upper part, so the arcs rise as arches towards the limb. The sun is due west.
const GULF = shot({ ex: 0.3, ey: -0.42, exP: 0, eyP: -0.85, camZ: 2.05, camZP: 3.2, lat: 3, lon: 42, roll: 0, sun: [-0.96, 0.2, 0.16], sunMirror: 0, fov: 35 });
const GULF_HOLD = variant(GULF, { camZ: 1.95, camZP: 3.05, lat: 4.5, lon: 42.5 });
const RINGS_A = shot({ ex: 0.62, ey: 0.02, exP: 0, eyP: -0.3, camZ: 5.3, camZP: 8.4, lat: 16, lon: 30, roll: 0.06, sun: [-0.72, 0.36, -0.58], sunMirror: 0, fov: 35 });
const RINGS_B = variant(RINGS_A, { lat: 18, lon: 36, roll: 0.03, camZ: 5.0, camZP: 8.0 });
// The rings meet above Hail — seen at 3/4 (Hail pushed towards the screen centre) so they read as orbits.
const RINGS_MEET = shot({ ex: 0.42, ey: 0.0, exP: 0, eyP: -0.3, camZ: 4.7, camZP: 7.4, lat: 12, lon: 41.69, lonSide: 20, roll: 0, sun: [-0.96, 0.16, 0.22], sunMirror: 0, fov: 35 });
// …then the camera lines up on Hail for the dive.
const DIVE_START = shot({ ex: 0, ey: 0, exP: 0, eyP: 0, camZ: 4.0, camZP: 5.4, lat: 27.52, lon: 41.69, roll: 0, sun: [-0.96, 0.16, 0.22], sunMirror: 0, fov: 35 });
const DIVE_END_Z = 1.06; // ≈ 380 km — the clouds cover everything before the texture would soften

const KEYS: [number, Shot][] = [
  [g('home', 0), HERO],
  [g('home', K.home.earthTurn[0]), HERO],
  [g('about', K.about.faceGulf[1]), GULF],
  [g('about', 1), GULF_HOLD],
  [g('cornerstones', 0.1), RINGS_A],
  [g('cornerstones', K.cornerstones.intersect[0]), RINGS_B],
  [g('cornerstones', K.cornerstones.intersect[1]), RINGS_MEET],
  [g('cornerstones', 1), RINGS_MEET],
  [g('positioning', 0.12), DIVE_START], // line up on Hail…
  [g('positioning', 1), DIVE_START], // …the fall itself is procedural (diveShot)
];

const SHOT_KEYS = ['ex', 'ey', 'exP', 'eyP', 'camZ', 'camZP', 'lat', 'lon', 'lonSide', 'roll', 'sunMirror', 'fov'] as const;
const out: Shot = { ...HERO, sun: new Vector3() };
function sample(G: number) {
  let k = 0;
  while (k < KEYS.length - 1 && KEYS[k + 1][0] <= G) k++;
  const [g0, a] = KEYS[k];
  const next = KEYS[k + 1];
  const t = next && G > g0 ? smootherstep(G, g0, next[0]) : 0;
  const b = next ? next[1] : a;
  for (const key of SHOT_KEYS) out[key] = lerp(a[key], b[key], t);
  out.sun.copy(a.sun).lerp(b.sun, t).normalize();
  return out;
}

/** The dive: from the lined-up shot towards Hail's surface, accelerating into the clouds. */
function diveShot(p: number, reduced: boolean) {
  const s = reduced ? 0 : clamp(p / COVER, 0, 1);
  const result = sample(g('positioning', reduced ? 0 : p));
  const fall = Math.pow(1 - s, 2.2);
  result.camZ = DIVE_END_Z + (result.camZ - DIVE_END_Z) * fall;
  result.camZP = DIVE_END_Z + (result.camZP - DIVE_END_Z) * fall;
  result.fov = lerp(35, 50, Math.pow(s, 1.3));
  return result;
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

    // where are we in the story?
    const idx = journey.index;
    const id = sectionIds[idx];
    const p = journey.p[idx];
    const G = idx + p;

    const s = id === 'positioning' ? diveShot(p, reduced) : sample(G);
    const ex = lerp(s.exP, s.ex * side, land);
    const ey = lerp(s.eyP, s.ey, land);
    const camZ = lerp(s.camZP, s.camZ, land);
    space.earthPosition.set(ex, ey, 0);

    const parallax = id === 'positioning' ? 1 - smoothstep(p, 0, 0.15) : 1;
    camera.position.set(smooth.px * 0.09 * parallax, smooth.py * 0.06 * parallax, camZ);
    camera.up.copy(UP);
    camera.lookAt(0, 0, 0);

    // face (lat, lon) towards the camera wherever the planet sits on screen
    const az = Math.atan2(camera.position.x - ex, camera.position.z);
    const el = Math.atan2(camera.position.y - ey, Math.hypot(camera.position.x - ex, camera.position.z));
    const heroWeight = 1 - smoothstep(G, g('home', K.home.earthTurn[0]), g('about', K.about.faceGulf[1]));
    const sway = reduced ? 0 : Math.sin(time * 0.07) * 0.08 * heroWeight;
    space.spin = spinToFace(s.lon + s.lonSide * side) + az + sway;
    space.tilt = s.lat * DEG - el;
    space.roll = s.roll * side;

    space.sunDirection.copy(s.sun);
    space.sunDirection.x *= lerp(1, side, s.sunMirror);
    space.sunDirection.normalize();
    space.cloudOffset = (space.cloudOffset + dt * (reduced ? 0 : 0.0015)) % 1;

    // story elements on and around the globe
    const reveal = space.rings.reveal;
    reveal.fill(0);
    let arcsDraw = 0;
    let arcsOpacity = 0;
    let whispers = 0;
    let rings = 0;
    let intersect = 0;
    let beacon = 0;
    let flare = 1;
    switch (id) {
      case 'about':
        arcsDraw = rangeProgress(p, K.about.arcs);
        arcsOpacity = 1;
        whispers = smoothstep(rangeProgress(p, K.about.whispers), 0, 0.3);
        beacon = smoothstep(p, 0.25, 0.55);
        break;
      case 'cornerstones':
        arcsDraw = 1;
        arcsOpacity = (1 - 0.75 * smoothstep(p, 0, 0.3)) * (1 - smoothstep(p, 0.62, 0.78));
        whispers = 1 - smoothstep(p, 0, 0.2);
        K.cornerstones.rings.forEach((r, i) => (reveal[i] = rangeProgress(p, r)));
        intersect = rangeProgress(p, K.cornerstones.intersect);
        rings = smoothstep(p, 0, 0.06);
        beacon = 1;
        break;
      case 'positioning':
        reveal.fill(1);
        intersect = 1;
        rings = smoothstep(camZ, 1.45, 2.3);
        beacon = smoothstep(camZ, 1.3, 2.1);
        flare = smoothstep(camZ, 2.0, 3.4);
        break;
    }
    Object.assign(space.arcs, { draw: arcsDraw, opacity: arcsOpacity });
    Object.assign(space.rings, { intersect, opacity: rings });
    space.whispers = whispers;
    space.beacon = beacon;
    space.flare = flare;

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
