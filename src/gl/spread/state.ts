import { Vector2, Vector3 } from 'three';

/** Mutable state shared by the word-of-mouth scene's parts (read/written in useFrame). */
export const gesture = { pressing: false, charge: 0, burstAt: -99, dragging: false, yaw: 0, startX: 0, startY: 0, startYaw: 0, moved: 0 };
export const mouse = { ndc: new Vector2(9, 9), inside: false, world: new Vector3(), on: 0 };
/** The broadcast wave (hold): origin on the ground, start time. */
export const wave = { origin: new Vector2(), at: -99 };
/** `front`: how far the conversation has spread (0..1+); `zoom`: 0 close on Hail → 1 whole region; `scrolling`. */
export const shared = { front: 0, zoom: 0, scrolling: false };
