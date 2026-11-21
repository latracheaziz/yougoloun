import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { getLenis } from '@/scroll/SmoothScroll';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { distortEnter, distortLeave, distortMove } from '@/interaction/distort';
import { projects } from '@/config/light';
import { useApp } from '@/store/app';
import { SectionMark } from '@/components/SectionMark';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const PIN_MEDIA = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
const domain = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/**
 * PDF §7 — three large project cards.
 * Desktop: the section pins and vertical scroll drives the cards sideways (images drift inside
 * their frames, cards tilt towards the pointer, liquid WebGL distortion on hover).
 * Touch / small screens / reduced motion: a native horizontal swipe track with snap + arrows.
 * Cards with a live website show a screenshot of it and link to it; the others use a placeholder.
 */
export function Portfolio() {
  const t = useContent();
  const dir = useApp((s) => s.dir);
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pin = useRef<ScrollTrigger | null>(null);
  useReveal(root);

  // Desktop: pinned horizontal scroll driven by the page scroll.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // CSS-sticky "pin" (same model as the other pinned sections; no GSAP pin-spacer):
      // the section gets one screen + the rail's overflow of height, its frame sticks, and the
      // scroll progress through it slides the rail.
      mm.add(PIN_MEDIA, () => {
        const el = track.current;
        const section = root.current;
        const frameEl = frame.current;
        const railEl = rail.current;
        if (!el || !section || !frameEl || !railEl) return;
        const rtl = dir === 'rtl';
        const distance = () => Math.max(0, railEl.scrollWidth - el.clientWidth);
        const size = () => {
          section.style.height = `${window.innerHeight + distance()}px`;
        };
        el.scrollLeft = 0;
        el.style.overflowX = 'hidden';
        el.style.scrollSnapType = 'none';
        Object.assign(frameEl.style, { position: 'sticky', top: '0px', height: '100svh' });
        size();
        ScrollTrigger.addEventListener('refreshInit', size);
        const count = t.portfolio.items.length;
        const tween = gsap.to(railEl, {
          x: () => (rtl ? 1 : -1) * distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => setIndex(Math.round(self.progress * (count - 1))),
          },
        });
        pin.current = tween.scrollTrigger ?? null;
        // images drift inside their frames as they cross the screen
        gsap.utils.toArray<HTMLElement>('[data-parallax]', el).forEach((img) => {
          gsap.fromTo(
            img,
            { xPercent: rtl ? 6 : -6 },
            {
              xPercent: rtl ? -6 : 6,
              ease: 'none',
              scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: rtl ? 'right left' : 'left right', end: rtl ? 'left right' : 'right left', scrub: true },
            },
          );
        });
        return () => {
          pin.current = null;
          ScrollTrigger.removeEventListener('refreshInit', size);
          section.style.height = '';
          Object.assign(frameEl.style, { position: '', top: '', height: '' });
          el.style.overflowX = '';
          el.style.scrollSnapType = '';
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [dir, t.lang] },
  );

  // cards tilt towards the pointer (fine pointers)
  useEffect(() => {
    const el = track.current;
    if (!el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const offs = gsap.utils.toArray<HTMLElement>('[data-tilt]', el).map((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 6);
      };
      const leave = () => {
        rx(0);
        ry(0);
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      return () => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      };
    });
    return () => offs.forEach((off) => off());
  }, [reduced, t.lang]);

  // current card (counter)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      const progress = max > 0 ? x / max : 0;
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
    const st = pin.current;
    if (st) {
      // pinned: move the page so the next / previous card comes in
      const count = t.portfolio.items.length;
      const next = Math.min(count - 1, Math.max(0, index + step));
      const y = st.start + (next / (count - 1)) * (st.end - st.start);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    const el = track.current;
    const card = el?.querySelector<HTMLElement>('article');
    if (!el || !card) return;
    const side = dir === 'rtl' ? -1 : 1;
    el.scrollBy({ left: step * side * (card.offsetWidth + 24), behavior: reduced ? 'auto' : 'smooth' });
  };

  const fine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const count = t.portfolio.items.length;

  return (
    <section ref={root} id="portfolio" data-tone="light" aria-labelledby="portfolio-title" className="relative bg-paper">
      <div ref={frame} className="flex flex-col overflow-hidden">
      <div className="shell section-y w-full pb-[clamp(3rem,6vw,5rem)] lg:pt-[clamp(6rem,13vh,8.5rem)] lg:pb-8">
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
        className="snap-x snap-mandatory overflow-x-auto px-[var(--gutter)] pb-[clamp(5rem,10vw,9rem)] [scrollbar-width:none] scroll-px-[var(--gutter)] lg:pb-10 [&::-webkit-scrollbar]:hidden"
      >
        <div ref={rail} className="flex w-max gap-6 [perspective:1400px] will-change-transform lg:gap-10">
        {t.portfolio.items.map((item, i) => {
          const p = projects[item.slug];
          return (
            <article
              key={item.slug}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}, ${item.name}`}
              data-tilt
              className="group w-[min(84vw,1040px)] shrink-0 snap-start select-none will-change-transform lg:w-[min(52vw,78vh)]"
              style={{ '--accent': p.accent } as CSSProperties}
            >
              <a
                href={p.url}
                target={p.url ? '_blank' : undefined}
                rel={p.url ? 'noopener noreferrer' : undefined}
                aria-label={p.url ? `${t.ui.visitSite}: ${domain(p.url)}` : undefined}
                tabIndex={p.url ? 0 : -1}
                data-cursor={p.url ? 'view' : undefined}
                draggable={false}
                className="relative block aspect-[16/10] overflow-hidden rounded-[22px] bg-navy shadow-[0_40px_80px_-50px_rgba(20,20,46,0.6)]"
                onPointerEnter={(e) => {
                  if (!fine || reduced) return;
                  const img = e.currentTarget.querySelector('img');
                  if (img) distortEnter(e.currentTarget, img);
                }}
                onPointerMove={(e) => fine && !reduced && distortMove(e.nativeEvent, e.currentTarget)}
                onPointerLeave={() => fine && distortLeave()}
              >
                <img
                  data-parallax
                  src={p.image}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-y-0 -left-[6%] h-full w-[112%] max-w-none object-cover object-top"
                />
                <span className="label absolute start-5 top-5 rounded-full bg-paper/90 px-3 py-1.5 text-ink backdrop-blur" lang="en" dir="ltr">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {p.url && (
                  <span className="label absolute end-5 top-5 rounded-full bg-paper/90 px-3 py-1.5 text-ink backdrop-blur" lang="en" dir="ltr">
                    {domain(p.url)} ↗
                  </span>
                )}
              </a>
              <div className="grid-12 mt-7 gap-y-5 lg:mt-5">
                <div className="col-span-12 md:col-span-5">
                  <h3 className="display text-[clamp(2rem,3.2vw,3rem)]" style={{ color: p.ink }}>
                    {item.name}
                  </h3>
                  <p lang={t.lang === 'ar' ? 'en' : 'ar'} className="mt-2 text-sm muted">
                    {item.nameAlt}
                  </p>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="link mt-4 inline-flex items-center gap-2 text-sm">
                      {t.ui.visitSite} <span lang="en" dir="ltr">{domain(p.url)} ↗</span>
                    </a>
                  )}
                </div>
                <div className="col-span-12 md:col-span-7">
                  <p className="max-w-[34rem] leading-relaxed muted lg:text-[0.95rem]">{item.description}</p>
                  <p className="label mt-6 lg:mt-4" style={{ color: p.ink }}>
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
      </div>
      </div>
    </section>
  );
}
