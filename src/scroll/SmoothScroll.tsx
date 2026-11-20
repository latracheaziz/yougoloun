import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bindStages, journey, measure, sectionIds, setStageHeight, update } from './journey';
import { useApp } from '@/store/app';
import { rangeProgress, timeline, type SectionId } from '@/config/timeline';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** The Lenis instance (null with reduced motion). */
export const getLenis = () => lenis;

/**
 * Scroll to a section: a space track (so its content is fully revealed) or any element id
 * of the light document.
 */
export function scrollToSection(id: string, opts: { immediate?: boolean } = {}) {
  const i = sectionIds.indexOf(id as SectionId);
  let y: number;
  if (i >= 0) {
    const enter = timeline.sections[i].content.enter;
    y = (journey.starts[i] ?? 0) + (journey.lengths[i] ?? 0) * (enter ? enter[1] + 0.01 : 0);
  } else {
    const el = document.getElementById(id);
    if (!el) return;
    y = el.getBoundingClientRect().top + window.scrollY;
  }
  if (lenis) lenis.scrollTo(y, { immediate: opts.immediate, duration: 1.6 });
  else window.scrollTo({ top: y, behavior: opts.immediate ? 'instant' : 'smooth' });
}

/** Lenis smooth scroll synced to the GSAP ticker; feeds the journey state. */
export function SmoothScroll() {
  const reducedMotion = useApp((s) => s.reducedMotion);

  useEffect(() => {
    setStageHeight();
    ScrollTrigger.config({ ignoreMobileResize: true });

    let off: (() => void) | undefined;
    if (!reducedMotion) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
      lenis.on('scroll', (l: Lenis) => {
        update(l.scroll, l.velocity);
        ScrollTrigger.update();
      });
      const raf = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      off = () => gsap.ticker.remove(raf);
    } else {
      const onScroll = () => update(window.scrollY);
      window.addEventListener('scroll', onScroll, { passive: true });
      off = () => window.removeEventListener('scroll', onScroll);
    }

    // Layout: re-measure when the document changes size; re-pin the stage height only on
    // width / orientation changes so the mobile URL bar never makes the journey jump.
    let lastW = window.innerWidth;
    const onResize = () => {
      const w = window.innerWidth;
      if (w !== lastW || Math.abs(window.innerHeight - journey.stageH) > 160) {
        lastW = w;
        setStageHeight();
      }
    };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(() => {
      measure();
      ScrollTrigger.refresh();
    });
    ro.observe(document.body);

    measure();
    update(window.scrollY);
    const unbindStages = bindStages();

    // Keyboard / screen-reader focus inside a hidden stage → bring that section on screen.
    const onFocusIn = (e: FocusEvent) => {
      const stage = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-stage]');
      const id = stage?.dataset.stage as SectionId | undefined;
      if (!id) return;
      const i = sectionIds.indexOf(id);
      const s = timeline.sections[i];
      const p = journey.p[i];
      const visible = (s.content.enter ? rangeProgress(p, s.content.enter) : 1) * (1 - (s.content.exit ? rangeProgress(p, s.content.exit) : 0));
      if (visible < 0.5) scrollToSection(id, { immediate: true });
    };
    document.addEventListener('focusin', onFocusIn);

    // Deep link (#services …) on first load.
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash && document.getElementById(hash)) setTimeout(() => scrollToSection(hash, { immediate: true }), 50);

    return () => {
      off?.();
      unbindStages();
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('focusin', onFocusIn);
      lenis?.destroy();
      lenis = null;
    };
  }, [reducedMotion]);

  return null;
}
