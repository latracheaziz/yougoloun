import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { useApp } from '@/store/app';
import { SectionMark } from '@/components/SectionMark';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Card surfaces, step 01 → 04 (ember appears once, on the final step). */
const SURFACES = [
  { bg: 'var(--color-paper-2)', fg: 'var(--color-ink)', mute: 'color-mix(in oklab, var(--color-ink) 58%, transparent)' },
  { bg: 'var(--color-ink)', fg: 'var(--color-paper)', mute: 'color-mix(in oklab, var(--color-paper) 62%, transparent)' },
  { bg: '#ffffff', fg: 'var(--color-ink)', mute: 'color-mix(in oklab, var(--color-ink) 58%, transparent)' },
  { bg: 'var(--color-ember)', fg: 'var(--color-ink)', mute: 'color-mix(in oklab, var(--color-ink) 72%, transparent)' },
];

/** PDF §8 — four sticky cards that pile on top of each other as you scroll. */
export function Process() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  useGSAP(
    () => {
      if (reduced) return;
      const items = gsap.utils.toArray<HTMLElement>('[data-step]', root.current);
      items.slice(0, -1).forEach((item, i) => {
        const card = item.querySelector('[data-card]');
        const next = items[i + 1];
        // explicit start values: tweening filter from 'none' starts at brightness(0) (black cards)
        gsap.fromTo(
          card,
          { scale: 1, filter: 'brightness(1)' },
          {
            scale: 0.92 + i * 0.015,
            filter: 'brightness(0.86)',
            ease: 'none',
            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true },
          },
        );
      });
    },
    { scope: root, dependencies: [reduced, t.lang] },
  );

  return (
    <section ref={root} id="process" data-tone="light" aria-labelledby="process-title" className="bg-paper">
      <div className="shell section-y">
        <div className="grid-12 gap-y-6">
          <div className="col-span-12 lg:col-span-8">
            <SectionMark n={7} label={t.process.label} className="muted" />
            <h2 id="process-title" data-reveal="lines" className="display h-section mt-6">
              {t.process.title}
            </h2>
          </div>
        </div>

        <ol className="mt-[clamp(3rem,7vw,6rem)]">
          {t.process.steps.map((step, i) => {
            const s = SURFACES[i % SURFACES.length];
            const last = i === t.process.steps.length - 1;
            return (
              <li
                key={step.num}
                data-step
                className="sticky"
                style={{ top: `calc(clamp(5.5rem, 12vh, 8rem) + ${i * 1.4}rem)`, marginBottom: last ? 0 : 'clamp(6rem, 22vh, 14rem)' }}
              >
                <article
                  data-card
                  className="grid-12 min-h-[min(68vh,620px)] origin-top content-between gap-y-10 rounded-[28px] p-[clamp(1.75rem,4vw,3.5rem)] shadow-[0_-24px_60px_-40px_rgba(14,14,16,0.5)] will-change-transform"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <div className="col-span-12 flex items-start justify-between gap-6">
                    <p className="label" style={{ color: s.mute }}>
                      {t.process.stepLabel} <span lang="en">{step.num}</span>
                    </p>
                    <span lang="en" aria-hidden="true" className="font-display text-[clamp(4.5rem,14vw,12rem)] leading-[0.8] font-semibold tracking-[-0.05em]" style={{ color: 'transparent', WebkitTextStroke: `1.5px ${s.fg}` }}>
                      {step.num}
                    </span>
                  </div>
                  <div className="col-span-12 lg:col-span-9">
                    <h3 className="display text-[clamp(2rem,4.6vw,4.4rem)]">{step.title}</h3>
                    <p className="mt-5 max-w-[38rem] text-[clamp(1rem,1.25vw,1.2rem)] leading-relaxed" style={{ color: s.mute }}>
                      {step.body}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
