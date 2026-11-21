import { Color, Vector2, Vector3 } from 'three';

/**
 * Mutable state of the 3D journey. The Director writes it every frame from the scroll
 * journey; scene components read it in useFrame. No React re-renders involved.
 */

/**
 * FEED — the social-media world (logo bubbles, phones, reactions, the four cornerstone objects).
 * Every object blends between four formations with the weights in `w` (they sum to 1).
 */
export const feed = {
  /** Where the subject sits in world space (beside the text; mirrored in RTL). */
  anchor: new Vector3(1.05, 0, 0),
  /** Story coordinate: section index + local progress. */
  G: 0,
  /** +1 LTR, -1 RTL (damped, so a language switch glides). */
  side: 1,
  /** 0 portrait → 1 landscape (damped). */
  land: 1,
  /** Smoothed pointer, -1..1 (y up). */
  pointer: new Vector2(),
  /** Pointer in NDC, raw (for hover pushes). */
  pointerRaw: new Vector2(-9, -9),
  /** Formation weights. */
  w: { hero: 1, about: 0, corner: 0, dive: 0 },
  /** About: comment bubbles flowing from the phones into the logo, 0..1. */
  chatter: 0,
  /** Cornerstones: per-object reveal 0..1, then meet 0..1 (they gather round the logo). */
  reveal: [0, 0, 0, 0],
  meet: 0,
  /** Signed scroll velocity, smoothed (objects spin with it). */
  velocity: 0,
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
