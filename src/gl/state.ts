import { Color, Vector3 } from 'three';

/**
 * Mutable state of the space journey. The Director writes it every frame from the scroll
 * journey; scene components read it in useFrame. No React re-renders involved.
 */

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

/** DIVE — cloud layers, streaks, and the cover that turns the screen white. */
export const dive = {
  /** 0..1 — full-screen cloud white-out, noise-dissolved. */
  cover: 0,
  coverColor: new Color(1, 1, 1),
  /** 0..1 — radial speed streaks. */
  streaks: 0,
  /** Distance travelled through the cloud stack (layer units). */
  cloudTravel: 0,
  clouds: 0,
  cloudLit: new Color(1.22, 1.24, 1.28),
  cloudShade: new Color(0.42, 0.48, 0.6),
  /** Camera shake amplitude (radians). */
  shake: 0,
};
