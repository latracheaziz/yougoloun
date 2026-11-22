import { useEffect, useState, type RefObject } from 'react';

/**
 * For the light site's small 3D canvases: `mounted` once the element comes within `margin` of the
 * viewport (lazy chunk + WebGL context only when needed), `active` while it's actually on screen
 * (the render loop pauses otherwise).
 */
export function useNear(ref: RefObject<Element | null>, margin = '60% 0px') {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), { rootMargin: margin });
    const seen = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    near.observe(el);
    seen.observe(el);
    return () => (near.disconnect(), seen.disconnect());
  }, [ref, margin]);
  return { mounted, active };
}
