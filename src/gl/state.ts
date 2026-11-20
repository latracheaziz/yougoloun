import { Color, Vector3 } from 'three';

/**
 * Mutable state of the three worlds. The Director writes it every frame from the scroll
 * journey; scene components read it in useFrame. No React re-renders involved.
 */
export type World = 'space' | 'hail';

export const world = {
  current: 'space' as World,
  /** Set once the Hail terrain has been generated (worker) and uploaded. */
  hailReady: false,
};

/**
 * SPACE — Earth, arcs, rings, beacon.
 * Globe orientation is a nested rotation: roll(Z) ⊃ tilt(X) ⊃ spin(Y);
 * spin = spinToFace(lon) and tilt = lat bring (lat, lon) to face +Z.
 */
export const space = {
  earthPosition: new Vector3(1.05, -0.32, 0),
  spin: 0,
  tilt: 0.42,
  roll: 0,
  /** World-space direction *towards* the sun. */
  sunDirection: new Vector3(-0.8, 0.32, -0.5).normalize(),
  /** World-space unit vector from the Earth's centre to Hail (computed by the Director). */
  hailDirection: new Vector3(0, 0, 1),
  cloudOffset: 0,
  nightLights: 1,
  flare: 1,
  /** Arcs from GCC/MENA cities to Hail. draw 0..1 (staggered draw-on), opacity 0..1. */
  arcs: { draw: 0, opacity: 0 },
  /** "They say" word particles converging on Hail, 0..1. */
  whispers: 0,
  /** Four cornerstone rings: per-ring reveal 0..1, then intersect 0..1 (all meet above Hail). */
  rings: { reveal: [0, 0, 0, 0], intersect: 0, opacity: 0 },
  /** Glowing marker on Hail, 0..1. */
  beacon: 0,
};

/** DIVE — clouds, streaks, cover (the transition mask that hides the world swap). */
export const dive = {
  /** 0..1 — full-screen cloud whiteout, noise-dissolved. 1 hides everything. */
  cover: 0,
  coverColor: new Color(1, 0.95, 0.88),
  /** 0..1 — radial speed streaks. */
  streaks: 0,
  /** Distance travelled through the cloud stack (layer units). */
  cloudTravel: 0,
  clouds: 0,
  cloudLit: new Color(1, 0.95, 0.9),
  cloudShade: new Color(0.7, 0.55, 0.5),
  /** Camera shake amplitude (radians). */
  shake: 0,
};

/** HAIL — terrain, sky, pin. Colours are recomputed from `night` every frame. */
export const hail = {
  /** 0 = golden hour, 1 = night. */
  night: 0,
  lightDirection: new Vector3(-0.78, 0.15, -0.6).normalize(),
  sunDirection: new Vector3(-0.78, 0.15, -0.6).normalize(),
  lightColor: new Color(),
  skyZenith: new Color(),
  skyHorizon: new Color(),
  skyGround: new Color(),
  sunColor: new Color(),
  ambientSky: new Color(),
  ambientGround: new Color(),
  /** 0..1 — pin drop animation progress (bounce included). */
  pinDrop: 0,
  /** Ground height at the pin (from the terrain generator). */
  groundAtPin: 0,
  sand: 1,
  /** Extra fog multiplier (portfolio haze). */
  haze: 1,
};

/** Shared starfield. */
export const sky = {
  stars: 1,
  /** 1 = hide stars below the horizon (Hail world). */
  horizonFade: 0,
};
