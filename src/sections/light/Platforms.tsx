import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { platforms } from '@/config/light';
import { useApp } from '@/store/app';
import { journey } from '@/scroll/journey';

/** Platforms we run campaigns on (from the PDF) — a marquee that speeds up with scroll velocity. */
export function Platforms() {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useApp((s) => s.reducedMotion);
  const dir = useApp((s) => s.dir);

  useEffect(() => {
    const el = track.current;
    if (!el || reduced) return;
    const tween = gsap.fromTo(el, { xPercent: 0 }, { xPercent: dir === 'rtl' ? 50 : -50, duration: 36, ease: 'none', repeat: -1 });
    let speed = 1;
    const tick = () => {
      const target = 1 + Math.min(Math.abs(journey.velocity) * 0.12, 5);
      speed += (target - speed) * 0.08;
      tween.timeScale(speed);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      tween.kill();
    };
  }, [reduced, dir]);

  const run = [...platforms, ...platforms];
  return (
    <section data-tone="light" aria-label={platforms.join(', ')} className="overflow-hidden border-y hairline bg-paper py-[clamp(1.5rem,3vw,2.5rem)]">
      <div ref={track} aria-hidden="true" className="flex w-max">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {run.map((name, i) => (
              <span key={`${half}-${i}`} lang="en" className="flex items-center">
                <span
                  className={`px-[clamp(1.25rem,3vw,2.75rem)] font-display text-[clamp(2.5rem,7vw,6.5rem)] font-semibold leading-none tracking-[-0.03em] ${i % 2 ? 'text-transparent [-webkit-text-stroke:1.5px_var(--color-ink)]' : 'text-ink'}`}
                >
                  {name}
                </span>
                <span className="text-[clamp(1rem,2vw,1.5rem)] text-ember">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
