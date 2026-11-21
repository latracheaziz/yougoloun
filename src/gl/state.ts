import { Color, Vector2 } from 'three';

/**
 * Mutable state of the 3D journey. The Director writes it every frame from the scroll
 * journey; scene components read it in useFrame. No React re-renders involved.
 */

/**
 * WORLD — the sunlit "world of conversation": the speech-bubble portal on its pool, the gallery
 * walkway, the plaza of four arches around the orb, a sea of clouds under a brand-blue sky.
 */
export const world = {
  /** Story coordinate: section index + local progress. */
  G: 0,
  /** +1 LTR, -1 RTL (damped). */
  side: 1,
  /** 0 portrait → 1 landscape (damped). */
  land: 1,
  /** Smoothed pointer, -1..1 (y up). */
  pointer: new Vector2(),
  /** Cornerstones: per-arch reveal 0..1, then meet 0..1 (the ribbon wraps the orb). */
  reveal: [0, 0, 0, 0],
  meet: 0,
  /** Seconds of scroll-driven ribbon travel (it speeds up with scroll velocity). */
  ribbon: 0,
  /** 0..1 — "hold to awaken" charge (src/interaction/hold.ts, advanced by Voice.tsx). */
  charge: 0,
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
