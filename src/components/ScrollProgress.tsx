import { useEffect, useRef } from 'react';
import { journey, onJourney } from '@/scroll/journey';

/** Thin brand-gradient progress bar across the top, through the light site (after the clouds). */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onJourney(() => {
        const el = bar.current;
        if (!el) return;
        const start = journey.tracksEnd;
        const end = document.documentElement.scrollHeight - window.innerHeight;
        const p = end > start ? Math.min(1, Math.max(0, (journey.y - start) / (end - start))) : 0;
        el.style.transform = `scaleX(${p})`;
        el.style.opacity = journey.y > start - journey.stageH * 0.2 ? '1' : '0';
      }),
    [],
  );
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px]">
      <div ref={bar} className="h-full origin-left bg-brand-gradient transition-opacity duration-500 rtl:origin-right" style={{ transform: 'scaleX(0)', opacity: 0 }} />
    </div>
  );
}
