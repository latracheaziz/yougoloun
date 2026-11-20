/** Normalised pointer (-1..1, y up), smoothed in the Director. Fine pointers only — no parallax on touch. */
export const pointer = { x: 0, y: 0 };

let bound = false;
export function bindPointer() {
  if (bound || typeof window === 'undefined') return () => {};
  if (!window.matchMedia('(pointer: fine)').matches) return () => {};
  bound = true;
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    window.removeEventListener('pointermove', onMove);
    bound = false;
  };
}
