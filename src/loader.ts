/**
 * The boot loader (#yg-loader, inline in index.html — painted before any JS).
 * `finishLoader()` sends it away (letters leap off, the curtain lifts) and releases everything that
 * waits on `whenLoaded()` (the hero intro), so intros play as the page appears, not hidden under it.
 * Home calls it once the 3D world has drawn; NotFound right away.
 */
const node = () => document.getElementById('yg-loader');

let leaving = typeof document === 'undefined' || !node();

/** The 3D world has actually rendered a few frames (src/gl/Experience.tsx → Drawn). */
export const boot = { glDrawn: false };
export const markGlDrawn = () => void (boot.glDrawn = true);
const waiters = new Set<(afterLoader: boolean) => void>();

/**
 * Run `fn` when the loader starts leaving — or now, if it's already gone. `afterLoader` is true when
 * the curtain is lifting at that moment (intros can wait a beat for it). Returns an unsubscribe.
 */
export function whenLoaded(fn: (afterLoader: boolean) => void) {
  if (leaving) {
    fn(false);
    return () => {};
  }
  waiters.add(fn);
  return () => void waiters.delete(fn);
}

export function finishLoader() {
  if (leaving) return;
  leaving = true;
  const el = node();
  if (el) {
    el.classList.add('ygl-out');
    window.setTimeout(() => el.remove(), 1400);
  }
  const queued = [...waiters];
  waiters.clear();
  queued.forEach((fn) => fn(true));
}
