import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useApp } from '@/store/app';

/**
 * Pulls its child towards the pointer while hovered, springs back on leave.
 * Fine pointers only; inert with reduced motion.
 */
export function Magnetic({ children, strength = 0.32, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useApp((s) => s.reducedMotion);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * strength);
      y((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [reduced, strength]);

  return (
    <span ref={ref} className={`inline-flex ${className}`}>
      {children}
    </span>
  );
}
