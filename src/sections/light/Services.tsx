import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { useApp } from '@/store/app';
import { useNear } from '@/hooks/useNear';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { brandImages, categoryOf, servicePreviews, type ServiceCategory } from '@/config/light';
import { whatsappLink } from '@/config/site';
import { SectionMark } from '@/components/SectionMark';
import type { ObjKey } from '@/gl/stage/ObjectStage';

// glossy 3D object per service (lazy 3D chunk), in front of the hover photo
const ObjectStage = lazy(() => import('@/gl/stage/ObjectStage'));
/** Service number -> its object (01 performance ... 12 community). */
const SERVICE_OBJECTS: Record<string, ObjKey> = {
  '01': 'chart', '02': 'logo', '03': 'hash', '04': 'camera', '05': 'play', '06': 'megaphone',
  '07': 'target', '08': 'phone', '09': 'bell', '10': 'comment', '11': 'growth', '12': 'heart',
};

type Filter = 'all' | ServiceCategory;
const FILTERS: Filter[] = ['all', 'growth', 'brand', 'content'];
const IMAGES = Object.keys(brandImages) as (keyof typeof brandImages)[];
const FINE = '(hover: hover) and (pointer: fine)';
const pad = (n: number) => String(n).padStart(2, '0');

/** The service's brand visual, cropped to its subject (servicePreviews). */
function Crop({ num, className = '' }: { num: string; className?: string }) {
  const p = servicePreviews[num] ?? servicePreviews['01'];
  return (
    <span
      aria-hidden="true"
      className={`block bg-navy bg-no-repeat ${className}`}
      style={{ backgroundImage: `url(${brandImages[p.image]})`, backgroundPosition: p.position, backgroundSize: `${p.zoom * 100}%` }}
    />
  );
}

/**
 * PDF §6 — the 12 services as an editorial list: large titles on hairlines.
 * Hover (desktop): the row fills with navy from the bottom (full-bleed) and turns white, the others step
 * back, and a photo of the service is revealed beside the pointer with its glossy 3D object in front.
 * Click / tap: the row opens — the service's text and a WhatsApp button pre-filled with the service
 * (one open at a time; on touch the photo is inside the open row). Filters: text tabs, rows fold away.
 */
export function Services() {
  const t = useContent();
  const items = t.services.items;
  const reduced = useApp((s) => s.reducedMotion);
  const fine = useMediaQuery(FINE);
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const intent = useRef(0);
  const tilt = useMemo(() => ({ current: 0 }), []);
  const objectKeys = useMemo(() => items.map((s) => SERVICE_OBJECTS[s.num] ?? 'logo'), [items]);
  const { mounted: near } = useNear(root, '40% 0px');
  useReveal(root);

  const shown = (num: string) => filter === 'all' || categoryOf(num) === filter;
  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === 'all' ? items.length : items.filter((s) => categoryOf(s.num) === f).length]));
  const ask = (title: string) => whatsappLink(`${t.ui.services.message} ${title}`);
  const hoverIndex = hovered ? items.findIndex((s) => s.num === hovered) : -1;

  // a tiny hover intent, so the photo doesn't flicker while the pointer crosses rows
  const hoverRow = (num: string | null) => {
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(() => setHovered(num), num ? 60 : 140);
  };
  useEffect(() => () => window.clearTimeout(intent.current), []);

  // rows open / fold (filters): the page height changes → re-measure the scroll triggers below
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 700);
    return () => window.clearTimeout(id);
  }, [open, filter]);

  // the photo follows the pointer vertically, in the free columns at the end of the list; it leans with the
  // pointer's speed. The list's rect is read once per hover / scroll, never per move.
  useEffect(() => {
    const el = preview.current;
    const ul = list.current;
    if (!el || !ul || !fine) return;
    const x = gsap.quickTo(el, 'x', { duration: reduced ? 0.01 : 0.7, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: reduced ? 0.01 : 0.6, ease: 'power3.out' });
    const rot = gsap.quickTo(el, 'rotate', { duration: 0.9, ease: 'power3.out' });
    let r: DOMRect | null = null;
    let lastX = 0;
    const stale = () => (r = null);
    const move = (e: PointerEvent) => {
      if (!r) r = ul.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl';
      const anchor = rtl ? r.left + r.width * 0.2 : r.right - r.width * 0.2;
      x(anchor + (e.clientX - anchor) * 0.08);
      y(gsap.utils.clamp(r.top + 140, r.bottom - 140, e.clientY));
      const v = e.clientX - lastX;
      lastX = e.clientX;
      if (!reduced) rot(gsap.utils.clamp(-7, 7, v * 0.35));
      tilt.current = gsap.utils.clamp(-1, 1, v * 0.08);
    };
    ul.addEventListener('pointermove', move);
    ul.addEventListener('pointerenter', stale);
    window.addEventListener('scroll', stale, { passive: true });
    return () => {
      ul.removeEventListener('pointermove', move);
      ul.removeEventListener('pointerenter', stale);
      window.removeEventListener('scroll', stale);
    };
  }, [fine, reduced, tilt]);

  // reveal / hide the photo: it opens like a curtain and settles from a slight zoom
  useEffect(() => {
    const el = preview.current;
    const img = photo.current;
    if (!el || !img) return;
    const on = !!hovered;
    const d = reduced ? 0.01 : 1;
    gsap.to(el, { autoAlpha: on ? 1 : 0, duration: 0.35 * d, ease: 'power2.out' });
    gsap.to(img, { clipPath: on ? 'inset(0% 0% 0% 0% round 22px)' : 'inset(100% 0% 0% 0% round 22px)', scale: on ? 1 : 1.12, duration: 0.8 * d, ease: 'expo.out' });
  }, [hovered, reduced]);

  const preview0 = servicePreviews[hovered ?? '01'] ?? servicePreviews['01'];

  return (
    <section ref={root} id="services" data-tone="light" aria-labelledby="services-title" className="bg-paper">
      <div className="shell section-y">
        <div className="grid-12 items-end gap-y-10">
          <div className="col-span-12 lg:col-span-7">
            <SectionMark n={5} label={t.services.label} variant="brand" className="muted" />
            <h2 id="services-title" data-reveal="lines" className="display h-section mt-6">
              {t.services.title}
            </h2>
          </div>
          <div data-reveal="up" role="group" aria-label={t.services.label} className="col-span-12 flex flex-wrap gap-x-8 gap-y-3 lg:col-span-5 lg:justify-end">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => {
                  setFilter(f);
                  if (open && f !== 'all' && categoryOf(open) !== f) setOpen(null);
                }}
                className="group relative pb-2 text-[1.1rem] transition-colors duration-300 aria-pressed:text-ink text-ink/55 hover:text-ink"
              >
                {t.ui.serviceFilters[f]}
                <sup lang="en" className="ms-1 font-mono text-[0.65rem] opacity-70">
                  {pad(counts[f])}
                </sup>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-brand-gradient transition-transform duration-500 ease-[var(--ease-out-expo)] group-aria-pressed:scale-x-100 rtl:origin-right" />
              </button>
            ))}
          </div>
        </div>

        <ul ref={list} className="svc-list mt-[clamp(3rem,6vw,5rem)] border-t hairline" onPointerLeave={() => hoverRow(null)}>
          {items.map((s) => {
            const isOpen = open === s.num;
            const panel = `service-${s.num}`;
            return (
              <li
                key={s.num}
                data-open={isOpen || undefined}
                inert={!shown(s.num)}
                className="svc-row grid transition-[grid-template-rows] duration-700 ease-[var(--ease-out-expo)]"
                style={{ gridTemplateRows: shown(s.num) ? '1fr' : '0fr' }}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="border-b hairline">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panel}
                      onClick={() => setOpen(isOpen ? null : s.num)}
                      onPointerEnter={(e) => e.pointerType === 'mouse' && hoverRow(s.num)}
                      className="group grid-12 w-full items-center py-[clamp(1.5rem,2.8vw,2.6rem)] text-start"
                    >
                      <span lang="en" className="col-span-2 self-start pt-[0.6em] font-mono text-sm opacity-50 md:col-span-1">
                        {s.num}
                      </span>
                      <span className="col-span-8 md:col-span-6">
                        <span className="block font-display text-[clamp(1.45rem,2.9vw,3rem)] font-normal leading-[1.2] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                          {s.title}
                        </span>
                        <span className="label mt-3 block opacity-55">{t.ui.serviceFilters[categoryOf(s.num)]}</span>
                      </span>
                      <span aria-hidden="true" className="col-span-2 justify-self-end md:col-span-1 md:col-start-12">
                        <span
                          className={`relative grid size-12 place-items-center rounded-full ring-1 ring-current/25 ring-inset transition-[box-shadow,transform] duration-500 ease-[var(--ease-out-expo)] md:size-14 ${isOpen ? 'rotate-45 bg-[image:var(--p-gradient-brand)] text-ink ring-0' : 'group-hover:bg-[image:var(--p-gradient-brand)] group-hover:text-ink group-hover:ring-0'}`}
                        >
                          <span className="absolute h-px w-4 bg-current" />
                          <span className="absolute h-4 w-px bg-current" />
                        </span>
                      </span>
                    </button>
                    <div id={panel} role="region" aria-label={s.title} className="expander" data-open={isOpen || undefined}>
                      <div>
                        <div className="grid-12 gap-y-6 pb-[clamp(2rem,3.5vw,3rem)]">
                          {!fine && <Crop num={s.num} className="col-span-12 aspect-[16/10] rounded-[18px]" />}
                          <div className="col-span-12 md:col-span-7 md:col-start-2">
                            <p className="max-w-[40rem] text-[clamp(1.02rem,1.25vw,1.2rem)] leading-relaxed opacity-80">{s.body}</p>
                            <a
                              href={ask(s.title)}
                              target="_blank"
                              rel="noopener noreferrer"
                              tabIndex={isOpen ? 0 : -1}
                              data-cursor="talk"
                              className="btn btn-brand mt-7 min-h-12 px-6"
                            >
                              {t.ui.services.ask}
                              <span aria-hidden="true" className="rtl:-scale-x-100">
                                ↗
                              </span>
                            </a>
                          </div>
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

      {/* hover photo + 3D object, following the pointer (decorative; fine pointers only) */}
      {fine && (
        <div ref={preview} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-30 opacity-0" style={{ visibility: 'hidden' }}>
          <div className="relative h-[380px] w-[300px] -translate-x-1/2 -translate-y-1/2">
            <div ref={photo} className="absolute inset-0 overflow-hidden rounded-[22px] shadow-[0_40px_80px_-30px_rgba(20,20,46,0.6)]" style={{ clipPath: 'inset(100% 0% 0% 0% round 22px)' }}>
              {IMAGES.map((k) => {
                const on = preview0.image === k;
                return (
                  <span
                    key={k}
                    className="absolute inset-0 bg-navy bg-no-repeat transition-[opacity,background-position,background-size] duration-700 ease-[var(--ease-out-expo)]"
                    style={{
                      backgroundImage: `url(${brandImages[k]})`,
                      opacity: on ? 1 : 0,
                      ...(on ? { backgroundPosition: preview0.position, backgroundSize: `auto ${preview0.zoom * 100}%` } : {}),
                    }}
                  />
                );
              })}
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy/70 to-transparent" />
            </div>
            {near && (
              <Suspense fallback={null}>
                <ObjectStage keys={objectKeys} index={hoverIndex} active={!!hovered} tilt={tilt} className="!absolute -bottom-14 -start-16 !h-[250px] !w-[250px]" />
              </Suspense>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
