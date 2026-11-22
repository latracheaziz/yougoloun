import { journey, sectionIndex } from '@/scroll/journey';
import { sectionConfig } from '@/config/timeline';

/**
 * One press, three gestures (mouse/pen/touch over the 3D part, never on links/buttons):
 *  - a quick CLICK (< 300 ms, no travel) → `pick` (the scene raycasts it: planets)
 *  - a press that TRAVELS → mouse: drag to look around (`look`); touch: it's a scroll, ignored
 *  - a press that STAYS → hold to awaken (below)
 *
 * HOLD TO AWAKEN — press and hold anywhere over the 3D part (not on a link/button/field) and the voice
 * charges; at full charge it "speaks" (a burst). The 3D scene reads `hold` every frame; the cursor ring
 * shows the charge through the `--hold` custom property on <html>.
 *
 * Touch: a hold that turns into a scroll (moves > 12 px) is cancelled, so scrolling never charges.
 */
export const hold = {
  /** Finger / button is down on a valid target. */
  pressing: false,
  /** 0..1 — charge (advanced in useFrame by `tickHold`). */
  charge: 0,
  /** Seconds (scene clock) of the latest burst; -1 = none yet. */
  burstAt: -1,
  /** Bursts so far (to vary them). */
  bursts: 0,
};

/** A click to raycast (client px), consumed by the scene. */
export const pick = { pending: null as null | { x: number; y: number }, x: 0, y: 0 };
/** Drag-to-look offsets (radians, target values; the Director springs them back to 0 on release). */
export const look = { dragging: false, yaw: 0, pitch: 0 };

const CHARGE_TIME = 1.15;
let downAt = 0;
let travelled = 0;
const IGNORE = 'a, button, input, textarea, select, summary, label, [role="button"], [data-no-hold]';
let start = { x: 0, y: 0 };
let mouse = true;

/** Only while the 3D world is on screen (before the dive's white-out). */
const COVER = sectionConfig('positioning').keys!.cover as number;
const inSpace = () => journey.index < sectionIndex.positioning || journey.p[sectionIndex.positioning] < COVER * 0.6;

export function bindHold() {
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || !inSpace()) return;
    if ((e.target as Element | null)?.closest(IGNORE)) return;
    hold.pressing = true;
    start = { x: e.clientX, y: e.clientY };
    downAt = performance.now();
    travelled = 0;
    mouse = e.pointerType === 'mouse';
  };
  const move = (e: PointerEvent) => {
    pick.x = e.clientX;
    pick.y = e.clientY;
    if (!hold.pressing && !look.dragging) return;
    travelled = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (hold.pressing && travelled > 10) {
      hold.pressing = false;
      if (mouse) look.dragging = true;
    }
    if (look.dragging) {
      look.yaw = Math.max(-0.45, Math.min(0.45, ((e.clientX - start.x) / window.innerWidth) * 1.4));
      look.pitch = Math.max(-0.2, Math.min(0.2, ((e.clientY - start.y) / window.innerHeight) * 0.6));
    }
  };
  const up = (e: Event) => {
    const quick = performance.now() - downAt < 300 && travelled < 6;
    if (hold.pressing && quick && e instanceof PointerEvent) pick.pending = { x: e.clientX, y: e.clientY };
    hold.pressing = false;
    look.dragging = false;
  };
  window.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', up);
  return () => {
    window.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    window.removeEventListener('blur', up);
    writeHold(0);
  };
}

/**
 * Show the charge on the rings that draw it. Written only when it changes, and only on those elements:
 * a custom property set on <html> every frame would restyle the whole page every frame.
 */
let shownHold = -1;
export function writeHold(v: number) {
  const r = Math.round(v * 100) / 100;
  if (r === shownHold) return;
  shownHold = r;
  document.querySelectorAll<HTMLElement>('.cursor-ring, .hold-ring').forEach((el) => el.style.setProperty('--hold', String(r)));
}

/** Advance the charge; returns true on the frame the voice bursts. */
export function tickHold(dt: number, time: number) {
  let burst = false;
  if (hold.pressing) {
    hold.charge = Math.min(1, hold.charge + dt / CHARGE_TIME);
    if (hold.charge >= 1) {
      burst = true;
      hold.burstAt = time;
      hold.bursts++;
      hold.pressing = false; // one burst per hold
    }
  } else {
    hold.charge = Math.max(0, hold.charge - dt * (burst || time - hold.burstAt < 0.6 ? 3 : 1.6));
  }
  writeHold(hold.charge);
  return burst;
}
