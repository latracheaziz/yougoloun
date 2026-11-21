import { journey, sectionIndex } from '@/scroll/journey';
import { sectionConfig } from '@/config/timeline';

/**
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

const CHARGE_TIME = 1.15;
const IGNORE = 'a, button, input, textarea, select, summary, label, [role="button"], [data-no-hold]';
let start = { x: 0, y: 0 };

/** Only while the 3D world is on screen (before the dive's white-out). */
const COVER = sectionConfig('positioning').keys!.cover as number;
const inSpace = () => journey.index < sectionIndex.positioning || journey.p[sectionIndex.positioning] < COVER * 0.6;

export function bindHold() {
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || !inSpace()) return;
    if ((e.target as Element | null)?.closest(IGNORE)) return;
    hold.pressing = true;
    start = { x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent) => {
    if (hold.pressing && e.pointerType !== 'mouse' && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) hold.pressing = false;
  };
  const up = () => (hold.pressing = false);
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
    document.documentElement.style.removeProperty('--hold');
  };
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
  document.documentElement.style.setProperty('--hold', hold.charge.toFixed(3));
  return burst;
}
