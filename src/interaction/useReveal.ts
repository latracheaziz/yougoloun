import { type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useApp } from '@/store/app';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Scroll reveals inside `scope`:
 *   [data-reveal="lines"] — text rises line by line out of a mask (words in Arabic, never letters)
 *   [data-reveal="up"]    — fades up
 * Plays once when the element enters the lower 15% of the viewport. Reduced motion: plain fade.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const reduced = useApp((s) => s.reducedMotion);
  const lang = useApp((s) => s.lang);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const ups = gsap.utils.toArray<HTMLElement>('[data-reveal="up"]', root);
      const lines = gsap.utils.toArray<HTMLElement>('[data-reveal="lines"]', root);

      if (reduced) {
        gsap.set([...ups, ...lines], { autoAlpha: 1 });
        return;
      }

      ups.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } },
        );
      });

      const splits: SplitText[] = [];
      let cancelled = false;
      document.fonts.ready.then(() => {
        if (cancelled) return;
        lines.forEach((el) => {
          gsap.set(el, { autoAlpha: 1 });
          const arabic = lang === 'ar';
          const split = SplitText.create(el, { type: arabic ? 'lines,words' : 'lines', mask: 'lines', linesClass: 'reveal-line' });
          splits.push(split);
          gsap.from(arabic ? split.words : split.lines, {
            yPercent: 110,
            duration: 1.2,
            ease: 'expo.out',
            stagger: arabic ? 0.04 : 0.09,
            scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          });
        });
        ScrollTrigger.refresh();
      });
      return () => {
        cancelled = true;
        splits.forEach((s) => s.revert());
      };
    },
    { scope, dependencies: [reduced, lang, ...deps], revertOnUpdate: true },
  );
}
