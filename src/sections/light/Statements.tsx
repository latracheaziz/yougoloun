import { useId, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { SectionMark } from '@/components/SectionMark';

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
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
        });
        slides.forEach((slide, i) => {
          const statement = slide.querySelector<HTMLElement>('[data-statement]')!;
          const split = SplitText.create(statement, { type: 'words', wordsClass: 'fill-word' });
          splits.push(split);
          const body = slide.querySelector('[data-body]');
          const at = i * 1.2;
          if (i > 0) {
            tl.fromTo(slide, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, at - 0.05);
            tl.fromTo(numbers[i], { yPercent: 100 }, { yPercent: 0, duration: 0.25 }, at - 0.05);
          }
          tl.fromTo(split.words, { opacity: 0.12 }, { opacity: 1, duration: 0.6, stagger: 0.6 / split.words.length, ease: 'none' }, at + 0.05);
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

        <div className="shell grid-12 w-full flex-1 items-center gap-y-8">
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

          {/* statements (stacked; one visible at a time) */}
          <div className="relative col-span-12 md:col-span-9">
            {items.map((item, i) => (
              <article key={item.num} data-slide className={i === 0 ? 'relative' : 'absolute inset-x-0 top-0'} style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}>
                <p data-statement className="display text-[clamp(2.4rem,6vw,6rem)]">
                  <span className="text-ink/50">{item.from}</span> <GradientArrow /> {item.to}
                </p>
                <p data-body className="mt-8 max-w-[34rem] text-[clamp(1rem,1.25vw,1.2rem)] leading-relaxed muted" style={{ opacity: 0 }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
