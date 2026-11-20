import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { useApp } from '@/store/app';
import { brandImages, categoryOf, servicePreviews, type ServiceCategory } from '@/config/light';
import { SectionMark } from '@/components/SectionMark';

type Filter = 'all' | ServiceCategory;
const FILTERS: Filter[] = ['all', 'growth', 'brand', 'content'];

/**
 * PDF §6 — the 12 services as an interactive list.
 * Desktop: hovering a row expands it and a visual preview follows the cursor.
 * Touch: tap to expand (accordion). Filter chips by the client's categories.
 */
export function Services() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const previewImg = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const intent = useRef(0);
  useReveal(root);

  // hover intent: rows expand after a short pause, so the list doesn't jump while the pointer travels
  const hoverRow = (num: string | null) => {
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(() => setHovered(num), num ? 110 : 160);
  };
  useEffect(() => () => window.clearTimeout(intent.current), []);

  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === 'all' ? t.services.items.length : t.services.items.filter((s) => categoryOf(s.num) === f).length]));

  // Preview follows the cursor vertically; horizontally it lives in the empty end column of the
  // list (so it never covers a title) and only leans a little towards the pointer. Fine pointers only.
  useEffect(() => {
    const el = preview.current;
    const list = root.current?.querySelector<HTMLElement>('[data-services-list]');
    if (!el || !list || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const x = gsap.quickTo(el, 'x', { duration: reduced ? 0.01 : 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: reduced ? 0.01 : 0.55, ease: 'power3.out' });
    const rot = gsap.quickTo(el, 'rotate', { duration: 0.8, ease: 'power3.out' });
    let lastX = 0;
    const onMove = (e: PointerEvent) => {
      const r = list.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl';
      const anchor = rtl ? r.left + r.width * 0.14 : r.right - r.width * 0.14; // centre of the preview
      x(anchor + (e.clientX - anchor) * 0.06);
      y(e.clientY);
      if (!reduced) rot(gsap.utils.clamp(-6, 6, (e.clientX - lastX) * 0.3));
      lastX = e.clientX;
    };
    list.addEventListener('pointermove', onMove);
    return () => list.removeEventListener('pointermove', onMove);
  }, [reduced]);

  useEffect(() => {
    const el = preview.current;
    if (!el) return;
    gsap.to(el, { autoAlpha: hovered ? 1 : 0, scale: hovered ? 1 : 0.85, duration: reduced ? 0.01 : 0.45, ease: 'expo.out' });
    if (hovered && previewImg.current) {
      const p = servicePreviews[hovered];
      previewImg.current.style.backgroundImage = `url(${brandImages[p.image]})`;
      previewImg.current.style.backgroundPosition = p.position;
      previewImg.current.style.backgroundSize = `${p.zoom * 100}%`;
    }
  }, [hovered, reduced]);

  return (
    <section ref={root} id="services" data-tone="light" aria-labelledby="services-title" className="bg-paper">
      <div className="shell section-y">
        <div className="grid-12 gap-y-8">
          <div className="col-span-12 lg:col-span-7">
            <SectionMark n={5} label={t.services.label} variant="brand" className="muted" />
            <h2 id="services-title" data-reveal="lines" className="display h-section mt-6">
              {t.services.title}
            </h2>
          </div>
          <div data-reveal="up" role="group" aria-label={t.services.label} className="col-span-12 flex flex-wrap items-end gap-2 lg:col-span-5 lg:justify-end">
            {FILTERS.map((f) => (
              <button key={f} type="button" className="chip text-sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {t.ui.serviceFilters[f]}
                <span lang="en" className="font-mono text-[0.7rem] opacity-55">
                  {String(counts[f]).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <ul data-services-list className="mt-[clamp(3rem,6vw,5rem)] border-t hairline" onPointerLeave={() => hoverRow(null)}>
          {t.services.items.map((s) => {
            const shown = filter === 'all' || categoryOf(s.num) === filter;
            const expanded = open === s.num || hovered === s.num;
            const panel = `service-${s.num}`;
            return (
              <li key={s.num} className="expander" data-open={shown || undefined} inert={!shown}>
                <div>
                  <div className="border-b hairline">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panel}
                      onClick={() => setOpen(open === s.num ? null : s.num)}
                      onPointerEnter={(e) => e.pointerType === 'mouse' && hoverRow(s.num)}
                      className="group relative grid-12 w-full items-baseline py-[clamp(1.1rem,2vw,1.75rem)] text-start before:absolute before:-start-4 before:top-1/2 before:h-10 before:w-1 before:-translate-y-1/2 before:scale-y-0 before:rounded-full before:bg-[image:var(--p-gradient-brand)] before:transition-transform before:duration-500 aria-expanded:before:scale-y-100"
                    >
                      <span lang="en" className="col-span-2 font-mono text-sm text-ink/60 transition-colors duration-300 group-aria-expanded:text-link md:col-span-1">
                        {s.num}
                      </span>
                      <span className="col-span-9 font-display text-[clamp(1.25rem,2.6vw,2.4rem)] font-medium leading-tight transition-transform duration-500 ease-[var(--ease-out-expo)] group-aria-expanded:translate-x-3 rtl:group-aria-expanded:-translate-x-3 md:col-span-8">
                        {s.title}
                      </span>
                      <span className="label col-span-2 hidden muted md:block">{t.ui.serviceFilters[categoryOf(s.num)]}</span>
                      <span aria-hidden="true" className="relative col-span-1 ms-auto size-4 self-center transition-transform duration-500 group-aria-expanded:rotate-45">
                        <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                        <span className="absolute inset-y-0 start-1/2 w-px bg-current" />
                      </span>
                    </button>
                    <div id={panel} role="region" aria-label={s.title} className="expander" data-open={expanded || undefined}>
                      <div>
                        <div className="grid-12 pb-7">
                          <p className="col-span-12 max-w-[40rem] text-[clamp(1rem,1.15vw,1.1rem)] leading-relaxed muted md:col-start-2 md:col-span-7">{s.body}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* cursor-following preview (decorative) */}
      <div ref={preview} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-30 hidden opacity-0 [@media(hover:hover)_and_(pointer:fine)]:block" style={{ visibility: 'hidden' }}>
        <div className="-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-[0_30px_60px_-20px_rgba(20,20,46,0.5)] ring-2 ring-white">
          <div ref={previewImg} className="h-[200px] w-[300px] bg-navy bg-no-repeat transition-[background-position,background-size] duration-700 ease-[var(--ease-out-expo)]" />
        </div>
      </div>
    </section>
  );
}
