import { lazy, Suspense, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { useApp } from '@/store/app';
import { SectionMark } from '@/components/SectionMark';
import { useNear } from '@/hooks/useNear';
import type { ObjKey } from '@/gl/stage/ObjectStage';

const ObjectStage = lazy(() => import('@/gl/stage/ObjectStage'));
/** Discovery, strategy, production & launch, optimisation & scaling. */
const STEP_OBJECTS: ObjKey[] = ['target', 'chart', 'megaphone', 'growth'];

/** The step's glossy 3D object, on the empty side of its card. */
function StepObject({ i, front }: { i: number; front: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const { mounted, active: visible } = useNear(box, '50% 0px');
  // cards pile up: only the one in front renders (the ones underneath are covered)
  const active = visible && front;
  return (
    <div ref={box} aria-hidden="true" className="absolute end-[4%] bottom-[8%] size-[clamp(9rem,24vw,22rem)] max-md:end-0 max-md:bottom-0">
      {mounted && (
        <Suspense fallback={null}>
          <ObjectStage keys={[STEP_OBJECTS[i % STEP_OBJECTS.length]]} index={0} active={active} scale={1.5} className="!absolute inset-0" />
        </Suspense>
      )}
    </div>
  );
}

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Card surfaces, step 01 → 04 — all from the brand palette (src/config/palette.ts).
 * `accent` fills the speech-bubble step label (navy text on it) and the faint bubble shape.
 * Text is always navy on light/blue/green surfaces and white on navy (never blue/green text).
 */
const SURFACES = [
  { bg: 'var(--color-paper-2)', fg: 'var(--color-ink)', mute: 'color-mix(in oklab, var(--color-ink) 66%, transparent)', accent: 'var(--p-gradient-blue)' },
  { bg: 'var(--color-navy)', fg: '#ffffff', mute: 'color-mix(in oklab, #ffffff 74%, transparent)', accent: 'var(--p-gradient-brand)' },
  { bg: '#ffffff', fg: 'var(--color-ink)', mute: 'color-mix(in oklab, var(--color-ink) 66%, transparent)', accent: 'var(--p-gradient-green)' },
  { bg: 'var(--p-gradient-brand)', fg: 'var(--color-ink)', mute: 'color-mix(in oklab, var(--color-ink) 80%, transparent)', accent: 'rgba(255,255,255,0.55)' },
];

/** PDF §8 — four sticky cards that pile on top of each other as you scroll. */
export function Process() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const [front, setFront] = useState(0);
  useReveal(root);

  useGSAP(
    () => {
      if (reduced) return;
      const items = gsap.utils.toArray<HTMLElement>('[data-step]', root.current);
      // which card is in front (its 3D object is the only one rendering)
      items.forEach((item, i) =>
        ScrollTrigger.create({ trigger: item, start: 'top 60%', onEnter: () => setFront(i), onLeaveBack: () => setFront(Math.max(0, i - 1)) }),
      );
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
            <SectionMark n={7} label={t.process.label} variant="brand" className="muted" />
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
                  className="relative grid-12 min-h-[min(68vh,620px)] origin-top content-between gap-y-10 overflow-hidden rounded-[28px] p-[clamp(1.75rem,4vw,3.5rem)] shadow-[0_-24px_60px_-40px_rgba(20,20,46,0.55)] will-change-transform"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <StepObject i={i} front={front === i || !!reduced} />
                  {/* faint speech-bubble shape, the logo's motif */}
                  <span aria-hidden="true" className="bubble pointer-events-none absolute -end-16 -bottom-20 h-64 w-96 opacity-25 max-md:-end-10 max-md:-bottom-12 max-md:h-32 max-md:w-48" style={{ background: s.accent }} />
                  <div className="relative col-span-12 flex items-start justify-between gap-6">
                    <p className="label bubble px-3 py-1.5 text-ink" style={{ background: s.accent }}>
                      {t.process.stepLabel} <span lang="en">{step.num}</span>
                    </p>
                    <span lang="en" aria-hidden="true" className="font-display text-[clamp(4.5rem,14vw,12rem)] leading-[0.8] font-semibold tracking-[-0.05em]" style={{ color: 'transparent', WebkitTextStroke: `1.5px ${s.fg}` }}>
                      {step.num}
                    </span>
                  </div>
                  <div className="relative col-span-12 lg:col-span-9">
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
