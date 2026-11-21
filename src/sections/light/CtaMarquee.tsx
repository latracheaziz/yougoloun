import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { journey } from '@/scroll/journey';
import { whatsappLink } from '@/config/site';

/**
 * Giant clickable "Book a Strategy Call" band at the top of the contact section: scrolls
 * continuously, speeds up with scroll velocity, slows right down under the pointer.
 */
export function CtaMarquee() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const dir = useApp((s) => s.dir);
  const track = useRef<HTMLDivElement>(null);
  const hover = useRef(false);

  useEffect(() => {
    const el = track.current;
    if (!el || reduced) return;
    const tween = gsap.fromTo(el, { xPercent: 0 }, { xPercent: dir === 'rtl' ? 50 : -50, duration: 28, ease: 'none', repeat: -1 });
    let speed = 1;
    const tick = () => {
      const target = hover.current ? 0.15 : 1 + Math.min(Math.abs(journey.velocity) * 0.1, 4);
      speed += (target - speed) * 0.08;
      tween.timeScale(speed);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      tween.kill();
    };
  }, [reduced, dir]);

  const label = t.hero.actions.primary;
  const run = Array.from({ length: 4 }, () => label);
  return (
    <a
      href={whatsappLink(t.ui.whatsappMessage)}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="talk"
      onPointerEnter={() => (hover.current = true)}
      onPointerLeave={() => (hover.current = false)}
      className="group block overflow-hidden border-y border-paper/10 py-[clamp(1.25rem,3vw,2.5rem)]"
    >
      <span className="sr-only">{label}</span>
      <div ref={track} aria-hidden="true" className="flex w-max">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {run.map((text, i) => (
              <span key={`${half}-${i}`} className="flex items-center">
                <span
                  className={`px-[clamp(1.5rem,3vw,3rem)] font-display text-[clamp(3rem,9vw,8.5rem)] leading-none font-semibold whitespace-nowrap transition-colors duration-500 ${
                    i % 2 ? 'text-transparent [-webkit-text-stroke:1.5px_var(--color-paper)] group-hover:[-webkit-text-stroke-color:var(--color-blue-light)]' : 'text-paper group-hover:text-blue-light'
                  }`}
                >
                  {text}
                </span>
                <span className="bubble size-[clamp(1.5rem,3vw,2.6rem)] shrink-0 bg-brand-gradient transition-transform duration-700 group-hover:rotate-12" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </a>
  );
}
