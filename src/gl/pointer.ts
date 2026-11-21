/**
 * Normalised pointer (-1..1, y up), smoothed in the Director. Fine pointers only — no parallax on touch.
 * `active`: the pointer is over the page (hover pushes in the 3D world need it).
 */
export const pointer = { x: 0, y: 0, active: false };

let bound = false;
export function bindPointer() {
  if (bound || typeof window === 'undefined') return () => {};
  if (!window.matchMedia('(pointer: fine)').matches) return () => {};
  bound = true;
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.active = true;
  };
  const onLeave = () => (pointer.active = false);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    bound = false;
  };
}
