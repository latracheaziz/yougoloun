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
    let skew = 0;
    let hovered = false;
    const section = el.parentElement!;
    const enter = () => (hovered = true);
    const leave = () => (hovered = false);
    section.addEventListener('pointerenter', enter);
    section.addEventListener('pointerleave', leave);
    const tick = () => {
      const target = hovered ? 0.2 : 1 + Math.min(Math.abs(journey.velocity) * 0.12, 5);
      speed += (target - speed) * 0.08;
      tween.timeScale(speed);
      skew += (gsap.utils.clamp(-10, 10, -journey.velocity * 0.35) - skew) * 0.12;
      gsap.set(el, { skewX: skew });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      section.removeEventListener('pointerenter', enter);
      section.removeEventListener('pointerleave', leave);
      tween.kill();
    };
  }, [reduced, dir]);

  const run = [...platforms, ...platforms];
  return (
    <section data-tone="light" aria-label={platforms.join(', ')} className="overflow-hidden border-y hairline bg-paper py-[clamp(1.5rem,3vw,2.5rem)]">
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="platforms-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-blue)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-green)' }} />
          </linearGradient>
        </defs>
      </svg>
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
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[clamp(1rem,2vw,1.5rem)] shrink-0">
                  <path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z" fill="url(#platforms-gradient)" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
