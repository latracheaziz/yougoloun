import { lazy, Suspense, useId, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { SectionMark } from '@/components/SectionMark';
import { useNear } from '@/hooks/useNear';

// the statements' words as morphing 3D particles (lazy chunk)
const WordMorph = lazy(() => import('@/gl/stage/WordMorph'));

/** Timeline position (units of the GSAP timeline) -> particle stage 0..5 (from0, to0, from1, to1, from2, to2). */
function stageAt(T: number, count: number) {
  for (let i = count - 1; i >= 0; i--) {
    const at = i * 1.2;
    if (T < at - 0.05 && i > 0) continue;
    if (T < at + 0.15) return 2 * i;
    if (T < at + 0.6) return 2 * i + (T - (at + 0.15)) / 0.45;
    if (T < at + 0.95 || i === count - 1) return 2 * i + 1;
    return Math.min(2 * i + 2, 2 * i + 1 + (T - (at + 0.95)) / 0.2);
  }
  return 0;
}

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/** Decorative arrow in the brand gradient (a shape, so blue/green never ends up as text on paper). */
function GradientArrow() {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden="true" viewBox="0 0 64 32" className="inline-block h-[0.55em] w-auto align-[0.08em] rtl:-scale-x-100">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-blue)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-green)' }} />
        </linearGradient>
      </defs>
      <path d="M2 16h52M40 3l15 13-15 13" fill="none" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * PDF §5 — the three positioning statements. The section pins; each statement fills word by word
 * as you scroll (from faint to full ink), its body follows, the big step number and the progress
 * rail advance, then it hands over to the next. Reduced motion: a plain stacked list.
 */
export function Statements() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const items = t.positioning.items;
  const morph = useMemo(() => ({ stage: 0 }), []);
  const words = useMemo(() => items.flatMap((it) => [it.from, it.to]), [items]);
  const stage = useRef<HTMLDivElement>(null);
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const { mounted, active } = useNear(stage);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || reduced) return;
      const slides = gsap.utils.toArray<HTMLElement>('[data-slide]', el);
      const numbers = gsap.utils.toArray<HTMLElement>('[data-num]', el);
      const rails = gsap.utils.toArray<HTMLElement>('[data-rail]', el);
      const splits: SplitText[] = [];
      let cancelled = false;

      document.fonts.ready.then(() => {
        if (cancelled) return;
        gsap.set(numbers.slice(1), { yPercent: 100, autoAlpha: 1 });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.7, onUpdate: (self) => (morph.stage = stageAt(self.progress * tl.duration(), items.length)) },
        });
        slides.forEach((slide, i) => {
          const body = slide.querySelector('[data-body]');
          const at = i * 1.2;
          if (i > 0) {
            tl.fromTo(slide, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, at - 0.05);
            tl.fromTo(numbers[i], { yPercent: 100 }, { yPercent: 0, duration: 0.25 }, at - 0.05);
          }
          tl.fromTo(body, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.2 }, at + 0.55);
          tl.fromTo(rails[i], { scaleY: 0 }, { scaleY: 1, duration: 0.85, ease: 'none' }, at);
          if (i < slides.length - 1) {
            tl.to(slide, { autoAlpha: 0, y: -60, duration: 0.25, ease: 'power2.in' }, at + 0.95);
            tl.to(numbers[i], { yPercent: -100, duration: 0.25 }, at + 0.95);
          }
        });
        tl.to({}, { duration: 0.3 }); // hold the last statement a moment
        ScrollTrigger.refresh();
      });
      return () => {
        cancelled = true;
        splits.forEach((s) => s.revert());
      };
    },
    { scope: root, dependencies: [reduced, t.lang] },
  );

  if (reduced) {
    return (
      <section ref={root} id="statements" data-tone="light" aria-labelledby="statements-title" className="bg-paper">
        <div className="shell section-y">
          <SectionMark n={4} label={t.positioning.label} variant="brand" className="muted" />
          <h2 id="statements-title" className="mt-4 font-display text-[clamp(1.25rem,2vw,1.75rem)] font-medium">
            {t.positioning.title}
          </h2>
          <ol className="mt-10">
            {items.map((item) => (
              <li key={item.num} className="border-t hairline py-10">
                <span lang="en" className="font-mono text-sm text-link">
                  {item.num}
                </span>
                <p className="display mt-4 text-[clamp(2.2rem,5.5vw,5.5rem)]">
                  <span className="text-ink/50">{item.from}</span> <GradientArrow /> {item.to}
                </p>
                <p className="mt-5 max-w-[34rem] muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} id="statements" data-tone="light" aria-labelledby="statements-title" className="relative bg-paper" style={{ height: `${items.length * 110 + 60}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div className="shell w-full pt-[clamp(6rem,14vh,9rem)]">
          <div className="grid-12 items-end border-b hairline pb-6">
            <div className="col-span-12 md:col-span-4">
              <SectionMark n={4} label={t.positioning.label} variant="brand" className="muted" />
            </div>
            <h2 id="statements-title" className="col-span-12 mt-3 font-display text-[clamp(1.1rem,1.8vw,1.6rem)] font-medium md:col-span-8 md:mt-0">
              {t.positioning.title}
            </h2>
          </div>
        </div>

        <div className="shell relative z-10 grid-12 w-full flex-1 items-center gap-y-6">
          {/* big step number + rail */}
          <div aria-hidden="true" className="col-span-12 flex items-center gap-6 md:col-span-3 md:flex-col md:items-start">
            <div className="relative h-[clamp(5rem,13vw,12rem)] overflow-hidden">
              {items.map((item, i) => (
                <span
                  key={item.num}
                  data-num
                  lang="en"
                  className="absolute inset-0 block font-display text-[clamp(5rem,13vw,12rem)] leading-none font-semibold tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.5px_var(--color-ink)]"
                  style={i === 0 ? undefined : { visibility: 'hidden' }}
                >
                  {item.num}
                </span>
              ))}
              <span lang="en" className="invisible block font-display text-[clamp(5rem,13vw,12rem)] leading-none font-semibold">
                00
              </span>
            </div>
            <div className="flex gap-2 md:flex-col">
              {items.map((item) => (
                <span key={item.num} className="relative h-1 w-14 overflow-hidden rounded-full bg-ink/10 md:h-14 md:w-1">
                  <span data-rail className="absolute inset-0 origin-left bg-brand-gradient md:origin-top rtl:origin-right md:rtl:origin-top" style={{ transform: 'scaleY(0)' }} />
                </span>
              ))}
            </div>
          </div>

          {/* the statement's words, morphing in particles (from -> to), then its body */}
          <div className="relative col-span-12 md:col-span-9">
            <div
              ref={(el) => {
                stage.current = el;
                setSurface(el);
              }}
              data-cursor="hold"
              aria-hidden="true"
              className="relative -mx-[var(--gutter)] h-[clamp(13rem,40vh,26rem)] md:mx-0"
            >
              {mounted && (
                <Suspense fallback={null}>
                  <WordMorph words={words} link={morph} active={active} surface={surface} className="!absolute inset-0" />
                </Suspense>
              )}
            </div>
            <div className="relative">
            {items.map((item, i) => (
              <article key={item.num} data-slide className={i === 0 ? 'relative' : 'absolute inset-x-0 top-0'} style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}>
                <p data-statement className="sr-only">
                  {item.from} {item.to}
                </p>
                <p data-body className="max-w-[34rem] text-[clamp(1rem,1.25vw,1.2rem)] leading-relaxed muted" style={{ opacity: 0 }}>
                  {item.body}
                </p>
              </article>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
