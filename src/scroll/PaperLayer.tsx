import { useEffect, useRef } from 'react';
import { journey, onJourney, sectionIndex } from './journey';
import { rangeProgress, sectionConfig } from '@/config/timeline';
import { useApp } from '@/store/app';

const KEYS = sectionConfig('positioning').keys;

/**
 * A fixed sheet of paper (#F5F3EF) between the canvas and the stages. It fades in over the
 * total cloud white-out, so the last WebGL frame (tone-mapped, vignetted) becomes exactly the
 * light site's background. It also hides the canvas while it pauses, unmounts or re-mounts.
 */
export function PaperLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      const i = sectionIndex.positioning;
      const p = journey.p[i];
      let o = rangeProgress(p, KEYS.paper);
      // inside the dive with no canvas ready (unmounted, or re-mounting on the way back up) → stay paper
      if (journey.index === i && p > KEYS.cover - 0.1 && !useApp.getState().glReady) o = 1;
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o > 0 ? 'visible' : 'hidden';
    };
    apply();
    const off = onJourney(apply);
    const unsub = useApp.subscribe((s, prev) => s.glReady !== prev.glReady && apply());
    return () => {
      off();
      unsub();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] bg-paper" style={{ opacity: 0, visibility: 'hidden' }} />;
}
