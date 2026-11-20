import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Quaternion, Vector3, type PerspectiveCamera } from 'three';
import { dive, hail, sky, space, world } from './state';
import { spinToFace } from './geo';
import { bindPointer, pointer } from './pointer';
import { HAIL_LOCAL } from './space/arcData';
import { CLOUD_PEAK_DEPTH } from './dive/Dive';
import { updateHailPalette } from './hail/palette';
import { journey, sectionIds, sectionIndex } from '@/scroll/journey';
import { rangeProgress, sectionConfig, type SectionId } from '@/config/timeline';
import { useApp } from '@/store/app';

/**
 * THE DIRECTOR — turns scroll progress into camera shots and world state, every frame.
 *
 * Everything is a pure function of the scroll position (no lag, no drift); only the layout
 * side (RTL mirror) and the aspect blend are damped so language/resize changes glide.
 *
 * Story coordinate G = sectionIndex + local progress. Shots are keyframed on G below.
 *   space:  hero → Gulf (arcs) → rings → Hail centred → DIVE (procedural) ┐
 *   hail:                                   ┌ cloud cover swap ←───────────┘
 *           top-down descent → landing at the pin → services orbit → portfolio haze
 *           → nightfall over the dunes → tilt to the stars → RISE ┐
 *   space:                              cloud cover swap ←─────────┘ → Earth, Hail glowing
 */

const { damp, lerp, smoothstep, smootherstep, clamp } = MathUtils;
const DEG = Math.PI / 180;

const K = {
  home: sectionConfig('home').keys,
  about: sectionConfig('about').keys,
  cornerstones: sectionConfig('cornerstones').keys,
  positioning: sectionConfig('positioning').keys,
  landing: sectionConfig('landing').keys,
  process: sectionConfig('process').keys,
  faq: sectionConfig('faq').keys,
  contact: sectionConfig('contact').keys,
};
const DIVE_SWAP = K.positioning.worldSwap;
const RISE_SWAP = K.contact.worldSwap;
const g = (id: SectionId, p: number) => sectionIndex[id] + p;

/** 0 → 1 → 0 over [a, m, b]. */
const bell = (x: number, a: number, m: number, b: number) => (x < m ? smoothstep(x, a, m) : 1 - smoothstep(x, m, b));

// ── SPACE SHOTS ──────────────────────────────────────────────────────────────────────
// ex/ey: planet offset on screen (landscape; ex is mirrored in RTL) · exP/eyP: portrait
// camZ / camZP: camera distance · lat/lon: point of the globe facing the camera
// sunMirror: 1 = the sun follows the layout mirror (hero), 0 = geographic sun
interface SpaceShot {
  ex: number;
  ey: number;
  exP: number;
  eyP: number;
  camZ: number;
  camZP: number;
  lat: number;
  lon: number;
  /** Longitude offset × layout side: keeps the subject towards the screen centre in both directions. */
  lonSide: number;
  roll: number;
  sun: Vector3;
  sunMirror: number;
  fov: number;
}
type ShotInput = Omit<SpaceShot, 'sun' | 'lonSide'> & { sun: [number, number, number]; lonSide?: number };
const shot = (o: ShotInput): SpaceShot => ({ lonSide: 0, ...o, sun: new Vector3(...o.sun).normalize() });
const variant = (base: SpaceShot, o: Partial<SpaceShot>): SpaceShot => ({ ...base, ...o, sun: (o.sun ?? base.sun).clone() });

const HERO = shot({ ex: 1.08, ey: -0.3, exP: 0, eyP: -1.6, camZ: 3.6, camZP: 4.4, lat: 24, lon: 30, roll: -0.16, sun: [-0.78, 0.58, -0.5], sunMirror: 1, fov: 35 });
// Golden hour over Hail, seen from the south at 3/4: the planet sits low, Hail near its upper
// part, so the arcs rise as arches against the curvature. The sun is due west.
const GULF = shot({ ex: 0.3, ey: -0.42, exP: 0, eyP: -0.85, camZ: 2.05, camZP: 3.2, lat: 3, lon: 42, roll: 0, sun: [-0.96, 0.2, 0.16], sunMirror: 0, fov: 35 });
const GULF_HOLD = variant(GULF, { camZ: 1.95, camZP: 3.05, lat: 4.5, lon: 42.5 });
const RINGS_A = shot({ ex: 0.62, ey: 0.02, exP: 0, eyP: -0.3, camZ: 5.3, camZP: 8.4, lat: 16, lon: 30, roll: 0.06, sun: [-0.72, 0.36, -0.58], sunMirror: 0, fov: 35 });
const RINGS_B = variant(RINGS_A, { lat: 18, lon: 36, roll: 0.03, camZ: 5.0, camZP: 8.0 });
// The rings meet above Hail — seen at 3/4 (Hail pushed towards the screen centre) so they read as orbits.
const RINGS_MEET = shot({ ex: 0.42, ey: 0.0, exP: 0, eyP: -0.3, camZ: 4.7, camZP: 7.4, lat: 12, lon: 41.69, lonSide: 20, roll: 0, sun: [-0.96, 0.16, 0.22], sunMirror: 0, fov: 35 });
// …then the camera lines up on Hail for the dive.
const DIVE_START = shot({ ex: 0, ey: 0, exP: 0, eyP: 0, camZ: 4.0, camZP: 5.4, lat: 27.52, lon: 41.69, roll: 0, sun: [-0.96, 0.16, 0.22], sunMirror: 0, fov: 35 });
const DIVE_END_Z = 1.06; // ≈ 380 km — clouds fully cover before the texture would soften
const CONTACT_NEAR = shot({ ex: 0, ey: 0, exP: 0, eyP: 0, camZ: 1.45, camZP: 1.6, lat: 27.52, lon: 41.69, roll: 0, sun: [-0.7, 0.32, -0.64], sunMirror: 0, fov: 44 });
const CONTACT_END = shot({ ex: 0.66, ey: -0.08, exP: 0, eyP: -1.45, camZ: 3.4, camZP: 4.5, lat: 25, lon: 40, roll: -0.08, sun: [-0.7, 0.32, -0.64], sunMirror: 0, fov: 35 });

const SPACE_KEYS: [number, SpaceShot][] = [
  [g('home', 0), HERO],
  [g('home', K.home.earthTurn[0]), HERO],
  [g('about', K.about.faceGulf[1]), GULF],
  [g('about', 1), GULF_HOLD],
  [g('cornerstones', 0.1), RINGS_A],
  [g('cornerstones', K.cornerstones.intersect[0]), RINGS_B],
  [g('cornerstones', K.cornerstones.intersect[1]), RINGS_MEET],
  [g('cornerstones', 1), RINGS_MEET],
  [g('positioning', 0.12), DIVE_START], // line up on Hail…
  [g('positioning', 1), DIVE_START], // …then the fall itself is procedural (diveShot)
  [g('contact', RISE_SWAP), CONTACT_NEAR],
  [g('contact', 1), CONTACT_END],
];

// ── HAIL POSES ───────────────────────────────────────────────────────────────────────
// World axes: +X east, −Z north. `north` = 1 keeps north at the top of the screen while
// looking straight down (continuity with the globe), 0 = normal horizon framing.
interface HailPose {
  pos: Vector3;
  target: Vector3;
  fov: number;
  north: number;
  linear?: boolean;
}
const pose = (pos: [number, number, number], target: [number, number, number], fov: number, north = 0, linear = false): HailPose => ({
  pos: new Vector3(...pos),
  target: new Vector3(...target),
  fov,
  north,
  linear,
});
const ORBIT_R = Math.hypot(61, 100);
const ORBIT_A0 = Math.atan2(61, 100);
const orbit = (a: number) => pose([Math.sin(a) * ORBIT_R, 24, Math.cos(a) * ORBIT_R], [0, 7, 0], 40, 0, true);

const H_TOP = pose([0, 560, 40], [0, 0, -30], 50, 1);
const H_LOW = pose([46, 190, 130], [-70, 0, -150], 46, 0.55);
const H_LAND = pose([58, 24, 96], [0, 6, 0], 40);
const H_PORT = pose([-26, 9, 64], [-170, 24, -60], 40);
const H_PORT_END = pose([-44, 9, 46], [-190, 22, -84], 40);
const H_PROC = pose([120, 82, 150], [-40, 0, -210], 40);
const H_PROC_END = pose([96, 72, 118], [-70, 0, -250], 40);
const H_SKY = pose([96, 64, 118], [-40, 260, -280], 44);
const H_RISE = pose([80, 620, 90], [-60, 900, -380], 50);

const HAIL_KEYS: [number, HailPose][] = [
  [g('positioning', DIVE_SWAP), H_TOP],
  [g('positioning', 1), H_LOW],
  [g('landing', K.landing.pinDrop[1]), H_LAND],
  [g('landing', 1), orbit(ORBIT_A0)],
  [g('services', 0.25), orbit(ORBIT_A0 - 0.14)],
  [g('services', 0.5), orbit(ORBIT_A0 - 0.28)],
  [g('services', 0.75), orbit(ORBIT_A0 - 0.42)],
  [g('services', 1), orbit(ORBIT_A0 - 0.55)],
  [g('portfolio', 0.12), H_PORT],
  [g('portfolio', 1), H_PORT_END],
  [g('process', K.process.nightfall[1]), H_PROC],
  [g('process', 1), H_PROC_END],
  [g('faq', K.faq.tiltToSky[1]), H_SKY],
  [g('contact', 0), H_SKY],
  [g('contact', RISE_SWAP), H_RISE],
];

// ── sampling ─────────────────────────────────────────────────────────────────────────
const SHOT_KEYS = ['ex', 'ey', 'exP', 'eyP', 'camZ', 'camZP', 'lat', 'lon', 'lonSide', 'roll', 'sunMirror', 'fov'] as const;
const outShot: SpaceShot = { ...HERO, sun: new Vector3() };
function sampleSpace(G: number) {
  let k = 0;
  while (k < SPACE_KEYS.length - 1 && SPACE_KEYS[k + 1][0] <= G) k++;
  const [g0, a] = SPACE_KEYS[k];
  const next = SPACE_KEYS[k + 1];
  const t = next && G > g0 ? smootherstep(G, g0, next[0]) : 0;
  const b = next ? next[1] : a;
  for (const key of SHOT_KEYS) outShot[key] = lerp(a[key], b[key], t);
  outShot.sun.copy(a.sun).lerp(b.sun, t).normalize();
  return outShot;
}

/** The dive: from DIVE_START towards Hail's surface, accelerating into the clouds. */
function diveShot(p: number, reduced: boolean) {
  const s = reduced ? 0 : clamp(p / DIVE_SWAP, 0, 1);
  const out = sampleSpace(g('positioning', reduced ? 0 : p));
  const fall = Math.pow(1 - s, 2.2);
  out.camZ = DIVE_END_Z + (out.camZ - DIVE_END_Z) * fall;
  out.camZP = DIVE_END_Z + (out.camZP - DIVE_END_Z) * fall;
  out.fov = lerp(35, 50, Math.pow(s, 1.3));
  return out;
}

const outPose: HailPose = { pos: new Vector3(), target: new Vector3(), fov: 40, north: 0 };
function sampleHail(G: number) {
  let k = 0;
  while (k < HAIL_KEYS.length - 1 && HAIL_KEYS[k + 1][0] <= G) k++;
  const [g0, a] = HAIL_KEYS[k];
  const next = HAIL_KEYS[k + 1];
  const b = next ? next[1] : a;
  const raw = next && G > g0 ? clamp((G - g0) / (next[0] - g0), 0, 1) : 0;
  const t = a.linear && b.linear ? raw : smootherstep(raw, 0, 1);
  outPose.pos.copy(a.pos).lerp(b.pos, t);
  outPose.target.copy(a.target).lerp(b.target, t);
  outPose.fov = lerp(a.fov, b.fov, t);
  outPose.north = lerp(a.north, b.north, t);
  return outPose;
}

// ── per-frame scratch ────────────────────────────────────────────────────────────────
const UP = new Vector3(0, 1, 0);
const NORTH = new Vector3(0, 0, -1);
const AX = new Vector3(1, 0, 0);
const AZ = new Vector3(0, 0, 1);
const qX = new Quaternion();
const qY = new Quaternion();
const qZ = new Quaternion();
const qGlobe = new Quaternion();
const target = new Vector3();
const right = new Vector3();
const smooth = { side: 1, land: 1, px: 0, py: 0, init: false };
const GOLDEN = { lit: [1.3, 1.12, 0.95], shade: [0.52, 0.36, 0.32], cover: [1.05, 0.93, 0.8] };
const NIGHT = { lit: [0.15, 0.19, 0.3], shade: [0.04, 0.05, 0.09], cover: [0.1, 0.13, 0.22] };

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
    const inHail = G >= g('positioning', DIVE_SWAP) && G < g('contact', RISE_SWAP);
    world.current = inHail ? 'hail' : 'space';

    // time of day in Hail (also drives the stars)
    hail.night = idx < sectionIndex.process ? 0 : id === 'process' ? rangeProgress(p, K.process.nightfall) : 1;
    updateHailPalette(hail.night);

    if (!inHail) {
      // ── SPACE ────────────────────────────────────────────────────────────────────
      let s: SpaceShot;
      if (id === 'positioning') s = diveShot(p, reduced);
      else if (reduced && id === 'contact') s = sampleSpace(g('contact', 1));
      else s = sampleSpace(G);

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
      qY.setFromAxisAngle(UP, space.spin);
      qX.setFromAxisAngle(AX, space.tilt);
      qZ.setFromAxisAngle(AZ, space.roll);
      qGlobe.copy(qZ).multiply(qX).multiply(qY);
      space.hailDirection.copy(HAIL_LOCAL).applyQuaternion(qGlobe).normalize();

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
        case 'contact':
          arcsDraw = 1;
          arcsOpacity = 0.75 * smoothstep(p, 0.5, 0.85);
          whispers = 0.6 * smoothstep(p, 0.6, 0.9);
          beacon = smoothstep(p, 0.4, 0.7);
          break;
      }
      Object.assign(space.arcs, { draw: arcsDraw, opacity: arcsOpacity });
      Object.assign(space.rings, { intersect, opacity: rings });
      space.whispers = whispers;
      space.beacon = beacon;
      space.flare = flare;

      setProjection(camera, s.fov + (1 - land) * 6, 0.01, 900);
    } else {
      // ── HAIL ─────────────────────────────────────────────────────────────────────
      let G2 = G;
      if (reduced && (id === 'positioning' || id === 'landing')) G2 = g('landing', K.landing.pinDrop[1]);
      if (reduced && id === 'contact') G2 = g('contact', 0);
      const ps = sampleHail(G2);
      target.copy(ps.target);
      // pointer parallax, along the camera's right / up directions
      right.subVectors(ps.target, ps.pos).cross(UP).normalize();
      if (ps.north < 0.5) target.addScaledVector(right, smooth.px * 4).addScaledVector(UP, smooth.py * 2.5);
      camera.position.copy(ps.pos);
      camera.up.copy(NORTH).lerp(UP, 1 - ps.north).normalize();
      camera.lookAt(target);

      hail.pinDrop = idx < sectionIndex.landing ? 0 : id === 'landing' ? rangeProgress(p, K.landing.pinDrop) : 1;
      hail.sand = idx <= sectionIndex.portfolio ? 1 : id === 'process' ? 1 - 0.7 * hail.night : 0.25;
      hail.haze = id === 'portfolio' ? 1 + 1.3 * Math.sin(Math.PI * p) : 1;

      setProjection(camera, ps.fov + (1 - land) * 16, 0.5, 5000);
    }

    // ── dive / rise: clouds, cover, streaks, shake ────────────────────────────────
    let cover = 0;
    let clouds = 0;
    let travel = 0;
    let streaks = 0;
    let shake = 0;
    let palette = GOLDEN;
    const crossing = (swap: number, from: number) => {
      cover = reduced
        ? bell(p, swap - 0.1, swap, swap + 0.1)
        : p < swap
          ? smoothstep(p, swap - 0.16, swap)
          : 1 - smoothstep(p, swap, swap + 0.16);
      travel =
        p < swap
          ? lerp(0, CLOUD_PEAK_DEPTH, rangeProgress(p, [from, swap]))
          : lerp(CLOUD_PEAK_DEPTH, CLOUD_PEAK_DEPTH + 40, rangeProgress(p, [swap, 1]));
    };
    if (id === 'positioning') {
      crossing(DIVE_SWAP, 0.16);
      clouds = smoothstep(p, 0.12, 0.3) * (1 - smoothstep(p, 0.68, 0.8));
      streaks = bell(p, 0.15, 0.5, 0.82) * 0.9;
      shake = bell(p, 0.25, 0.55, 0.9) * 0.0032;
    } else if (id === 'contact') {
      crossing(RISE_SWAP, 0.06);
      clouds = 0; // the rise reads better as the cover alone (night clouds become a grey puff)
      streaks = bell(p, 0.05, 0.3, 0.55) * 0.5;
      palette = NIGHT;
    }
    if (reduced) {
      clouds = 0;
      streaks = 0;
      shake = 0;
    }
    if (inHail && !world.hailReady) cover = 1; // terrain still generating → stay in the clouds
    Object.assign(dive, { cover, clouds, cloudTravel: travel, streaks, shake });
    dive.cloudLit.setRGB(palette.lit[0], palette.lit[1], palette.lit[2]);
    dive.cloudShade.setRGB(palette.shade[0], palette.shade[1], palette.shade[2]);
    dive.coverColor.setRGB(palette.cover[0], palette.cover[1], palette.cover[2]);

    if (shake > 0) {
      camera.rotateX(Math.sin(time * 23.1) * Math.sin(time * 7.3) * shake);
      camera.rotateY(Math.sin(time * 19.7 + 1.3) * Math.sin(time * 5.1) * shake);
      camera.rotateZ(Math.sin(time * 11.9 + 2.1) * shake * 0.6);
    }

    // stars: full in space, only after nightfall in Hail, never below the horizon there
    sky.stars = inHail ? smoothstep(hail.night, 0.3, 1) : 1;
    sky.horizonFade = inHail ? 1 : 0;
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
