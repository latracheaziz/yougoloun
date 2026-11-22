import { useEffect, useRef } from 'react';
import { journey, onJourney } from '@/scroll/journey';

/** Thin brand-gradient progress bar across the top, through the light site (after the clouds). */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // the page height, cached: reading scrollHeight on every frame forced a full-page layout per frame
    let max = document.documentElement.scrollHeight - window.innerHeight;
    const ro = new ResizeObserver(([e]) => (max = e.contentRect.height - window.innerHeight));
    ro.observe(document.body);
    const off = onJourney(() => {
      const el = bar.current;
      if (!el) return;
      const start = journey.tracksEnd;
      const p = max > start ? Math.min(1, Math.max(0, (journey.y - start) / (max - start))) : 0;
      el.style.transform = `scaleX(${p})`;
      el.style.opacity = journey.y > start - journey.stageH * 0.2 ? '1' : '0';
    });
    return () => (off(), ro.disconnect());
  }, []);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px]">
      <div ref={bar} className="h-full origin-left bg-brand-gradient transition-opacity duration-500 rtl:origin-right" style={{ transform: 'scaleX(0)', opacity: 0 }} />
    </div>
  );
}
