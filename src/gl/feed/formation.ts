import { Vector3 } from 'three';

/** About formation, shared by the World and the Chatter: where phone i stands in the fan. */
export function phoneFan(i: number, out: Vector3) {
  const k = i - 2;
  return out.set(k * 0.72, -0.25 - Math.abs(k) * 0.1, -Math.abs(k) * 0.38);
}

/** About formation: the logo floats above the fan (the comment bubbles fly into it). */
export const LOGO_ABOUT = new Vector3(0.05, 1.12, -1.1);
