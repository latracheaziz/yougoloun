import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { distortEnter, distortLeave, distortMove } from '@/interaction/distort';
import { projects } from '@/config/light';
import { useApp } from '@/store/app';
import { SectionMark } from '@/components/SectionMark';

/**
 * PDF §7 — three large project cards on a horizontal track: drag (mouse), swipe (touch),
 * arrows / keyboard. Each card wears its project's accent; images get a liquid WebGL
 * distortion on hover. Images are placeholders until the client sends photos.
 */
export function Portfolio() {
  const t = useContent();
  const dir = useApp((s) => s.dir);
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  useReveal(root);

  // progress bar + current card
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      const progress = max > 0 ? x / max : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${0.12 + progress * 0.88})`;
      setIndex(Math.round(progress * (t.portfolio.items.length - 1)));
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [t.portfolio.items.length]);

  // drag to scroll with the mouse (touch scrolls natively)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let down = false;
    let moved = 0;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true;
      moved = 0;
      lastX = e.clientX;
      el.style.scrollSnapType = 'none';
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      el.scrollBy({ left: -dx });
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      el.releasePointerCapture(e.pointerId);
      el.style.scrollSnapType = '';
    };
    const onClick = (e: MouseEvent) => {
      if (moved > 6) e.preventDefault();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  const go = (step: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>('article');
    if (!el || !card) return;
    const side = dir === 'rtl' ? -1 : 1;
    el.scrollBy({ left: step * side * (card.offsetWidth + 24), behavior: reduced ? 'auto' : 'smooth' });
  };

  const fine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const count = t.portfolio.items.length;

  return (
    <section ref={root} id="portfolio" data-tone="light" aria-labelledby="portfolio-title" className="bg-paper">
      <div className="shell section-y pb-[clamp(3rem,6vw,5rem)]">
        <div className="grid-12 items-end gap-y-8">
          <div className="col-span-12 lg:col-span-8">
            <SectionMark n={6} label={t.portfolio.label} variant="brand" className="muted" />
            <h2 id="portfolio-title" data-reveal="lines" className="display h-section mt-6">
              {t.portfolio.title}
            </h2>
          </div>
          <div data-reveal="up" className="col-span-12 flex items-center gap-4 lg:col-span-4 lg:justify-end">
            <span lang="en" dir="ltr" className="font-mono text-sm muted">
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
            <span className="relative h-px w-28 overflow-hidden bg-ink/12">
              <span ref={bar} className="absolute inset-0 origin-left bg-brand-gradient rtl:origin-right" style={{ transform: 'scaleX(0.12)' }} />
            </span>
            <button type="button" aria-label={t.ui.carousel.previous} onClick={() => go(-1)} className="chip size-12 justify-center p-0">
              <span aria-hidden="true" className="rtl:-scale-x-100">←</span>
            </button>
            <button type="button" aria-label={t.ui.carousel.next} onClick={() => go(1)} className="chip size-12 justify-center p-0">
              <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={track}
        role="region"
        aria-label={t.portfolio.title}
        tabIndex={0}
        data-cursor="drag"
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-[var(--gutter)] pb-[clamp(5rem,10vw,9rem)] [scrollbar-width:none] scroll-px-[var(--gutter)] [&::-webkit-scrollbar]:hidden"
      >
        {t.portfolio.items.map((item, i) => {
          const p = projects[item.slug];
          return (
            <article
              key={item.slug}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count} — ${item.name}`}
              className="group w-[min(84vw,1040px)] shrink-0 snap-start select-none"
              style={{ '--accent': p.accent } as CSSProperties}
            >
              <div
                className="relative aspect-[16/10] overflow-hidden rounded-[22px] bg-navy"
                onPointerEnter={(e) => {
                  if (!fine || reduced) return;
                  const img = e.currentTarget.querySelector('img');
                  if (img) distortEnter(e.currentTarget, img);
                }}
                onPointerMove={(e) => fine && !reduced && distortMove(e.nativeEvent, e.currentTarget)}
                onPointerLeave={() => fine && distortLeave()}
              >
                <img
                  src={p.image}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                />
                <span className="label absolute start-5 top-5 rounded-full bg-paper/90 px-3 py-1.5 text-ink backdrop-blur" lang="en" dir="ltr">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="grid-12 mt-7 gap-y-5">
                <div className="col-span-12 md:col-span-5">
                  <h3 className="display text-[clamp(2rem,3.6vw,3.4rem)]" style={{ color: p.ink }}>
                    {item.name}
                  </h3>
                  <p lang={t.lang === 'ar' ? 'en' : 'ar'} className="mt-2 text-sm muted">
                    {item.nameAlt}
                  </p>
                </div>
                <div className="col-span-12 md:col-span-7">
                  <p className="max-w-[34rem] leading-relaxed muted">{item.description}</p>
                  <p className="label mt-6" style={{ color: p.ink }}>
                    {t.portfolio.scopeLabel}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {item.scope.map((tag) => (
                      <li key={tag} className="rounded-full border border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] px-3 py-1.5 text-sm capitalize">
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
        <span aria-hidden="true" className="w-px shrink-0" />
      </div>
    </section>
  );
}
