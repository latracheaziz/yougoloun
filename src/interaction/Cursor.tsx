import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useContent } from '@/i18n/LangContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useApp } from '@/store/app';

type Mode = 'view' | 'drag' | 'talk' | 'react' | 'hold';

/**
 * Custom cursor: a dot + a ring that grows over anything clickable, and becomes a labelled
 * disc over [data-cursor="view|drag|talk"]. Difference blending keeps it visible on dark space
 * and on the light paper alike. Fine pointers only; the native cursor stays for everyone else.
 */
export function Cursor() {
  const fine = useMediaQuery('(hover: hover) and (pointer: fine)');
  const reduced = useApp((s) => s.reducedMotion);
  const t = useContent();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!fine || !dot.current || !ring.current) return;
    const html = document.documentElement;
    html.classList.add('has-cursor');
    const lag = reduced ? 0.01 : 0.18;
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.01 });
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.01 });
    const rx = gsap.quickTo(ring.current, 'x', { duration: lag, ease: 'power3.out' });
    const ry = gsap.quickTo(ring.current, 'y', { duration: lag, ease: 'power3.out' });
    let shown = false;

    const labels: Record<Mode, string> = { view: t.ui.cursor.view, drag: t.ui.cursor.drag, talk: t.ui.cursor.talk, react: t.ui.cursor.react, hold: t.ui.cursor.hold };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        gsap.to([dot.current, ring.current], { autoAlpha: 1, duration: 0.3 });
      }
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    };
    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const labelled = target?.closest<HTMLElement>('[data-cursor]');
      const clickable = target?.closest('a, button, [role="button"], summary, label');
      // a link/button inside a labelled area (e.g. the CTAs on a 'hold' stage) keeps the hover state
      const mode = (clickable && labelled?.contains(clickable) ? undefined : labelled?.dataset.cursor) as Mode | undefined;
      ring.current!.dataset.state = mode ? 'label' : clickable ? 'hover' : '';
      ring.current!.dataset.mode = mode ?? '';
      if (label.current) label.current.textContent = mode ? labels[mode] : '';
    };
    const onLeave = () => {
      shown = false;
      gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: 0.3 });
    };
    const onDown = () => ring.current?.setAttribute('data-down', '');
    const onUp = () => ring.current?.removeAttribute('data-down');

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      html.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [fine, reduced, t]);

  if (!fine) return null;
  return (
    <div aria-hidden="true" className="cursor">
      <div ref={ring} className="cursor-ring">
        <span ref={label} className="cursor-label label" />
      </div>
      <div ref={dot} className="cursor-dot" />
    </div>
  );
}
