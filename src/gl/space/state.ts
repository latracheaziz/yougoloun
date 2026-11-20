import { Vector3 } from 'three';

/**
 * Mutable state of the "space" world. The Director writes it every frame from the scroll
 * journey; Earth, clouds, atmosphere and flare read it. No React re-renders involved.
 *
 * Globe orientation is a nested rotation: roll(Z) ⊃ tilt(X) ⊃ spin(Y).
 * spin = spinToFace(lon) and tilt = lat bring (lat, lon) to face +Z.
 */
export const space = {
  earthPosition: new Vector3(1.05, -0.32, 0),
  spin: 0,
  tilt: 0.38,
  roll: 0,
  /** World-space direction *towards* the sun. */
  sunDirection: new Vector3(-0.8, 0.32, -0.5).normalize(),
  /** Clouds drift (UV offset, wraps). */
  cloudOffset: 0,
  /** 0..1 — city-light intensity multiplier. */
  nightLights: 1,
  /** 0..1 — sun flare visibility. */
  flare: 1,
};
