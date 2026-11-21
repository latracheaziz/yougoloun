import { Vector3 } from 'three';

/**
 * Where everything stands (metres, y up; the camera starts on +z looking down −z).
 *
 *   HERO island (z ≈ 0)  — mirror pool + the blue speech-bubble portal (green one behind)
 *   WALKWAY  (z −7…−27)  — arch frames with the agency's creatives, cypress trees
 *   PLAZA    (z ≈ −36)   — four doorway arches (the cornerstones) around the orb over a pool
 *
 * The camera path in Director.tsx is written against these numbers.
 */
export const HERO = { center: new Vector3(0, 0, 0), radius: 9, pool: 6.4 };
export const WALK = { from: -6.5, to: -27.5, width: 8.8 };
export const PLAZA = { center: new Vector3(0, 0, -36), radius: 11, pool: 3.6, archRadius: 8.2 };

/** The blue portal (the logo's front bubble): outer size, window inset, depth; centre of the window. */
export const PORTAL = { w: 4.6, h: 3.6, r: 1.05, inset: 0.52, depth: 0.62, bottom: 1.05 };
export const PORTAL_WINDOW_Y = PORTAL.bottom + PORTAL.h / 2;

/** The orb floating over the plaza pool. */
export const ORB = { center: new Vector3(0, 3.3, PLAZA.center.z), radius: 1.25 };

/** Gallery frames along the walkway: [x, z, rotY]. */
export const GALLERY: [number, number, number][] = [
  [-3.1, -10, 0.5],
  [3.1, -12.5, -0.5],
  [-3.1, -15.5, 0.5],
  [3.1, -18, -0.5],
  [-3.1, -21, 0.5],
  [3.1, -23.5, -0.5],
];

/**
 * Cypress trees: [x, z, scale]. Two flank the hero island; the rest line the walkway behind the
 * gallery frames. None near the plaza or the walkway entrance — those land behind the copy.
 */
export const CYPRESS: [number, number, number][] = [
  [-5.6, -4.6, 0.95], [5.6, -5.0, 1.05],
  [-3.65, -13.2, 0.85], [3.65, -15.4, 0.9],
  [-3.65, -18.6, 0.88], [3.65, -21.0, 0.82],
  [-3.65, -24.2, 0.8], [3.65, -26.0, 0.86],
];

/**
 * Plaza arch i stands at this angle (radians; x = cos, z = sin, so 3π/2 = the far side), facing the centre.
 * A half-ring on the far side (like a colonnade): nothing stands between the walkway and the orb.
 * Order = cornerstones order, read in the reading direction.
 */
export const ARCH_ANGLES = [Math.PI * 1.0, Math.PI * 1.34, Math.PI * 1.66, Math.PI * 2.0];

export type PlantKind = 'quiver' | 'shrub' | 'bush';
/**
 * Real plants: [kind, x, z, height (m), rotation]. Desert quiver trees frame the hero island and the
 * far side of the plaza; shrubs sit at the foot of the pool rims, frames and arches (grounding them).
 */
export const PLANTS: [PlantKind, number, number, number, number][] = [
  ['quiver', -6.4, -5.2, 4.4, 0.4],
  ['quiver', 7.4, 1.3, 3.6, 2.1],
  ['shrub', -6.4, 4.1, 0.9, 0.2],
  ['bush', 7.1, -2.7, 0.7, 1.4],
  ['shrub', 6.6, 4.4, 1.0, 2.6],
  ['bush', -7.4, 1.8, 0.8, 0.9],
  ['shrub', -3.95, -11.2, 0.8, 1.1],
  ['bush', 3.95, -13.7, 0.7, 0.3],
  ['shrub', -3.95, -16.7, 0.75, 2.2],
  ['bush', 3.95, -19.2, 0.7, 1.7],
  ['shrub', -3.95, -22.1, 0.8, 0.6],
  ['quiver', -6.2, -44.6, 4.8, 1.2],
  ['quiver', 6.4, -44.2, 4.2, 2.9],
  ['shrub', -2.9, -31.6, 0.8, 0.5],
  ['bush', 3.1, -32.0, 0.7, 2.4],
];
