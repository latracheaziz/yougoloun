import { useEffect, useRef, type CSSProperties } from 'react';
import { useContent } from '@/i18n/LangContext';
import { SectionMark } from '@/components/SectionMark';
import { journey, onJourney, sectionIndex } from '@/scroll/journey';
import { rangeProgress, sectionConfig } from '@/config/timeline';
import { useApp } from '@/store/app';

const KEYS = sectionConfig('cornerstones').keys;
/** Same order and colours as the 3D objects' orbit rings (gl/feed/World.tsx, CORNER). */
const RING_COLORS = ['var(--color-blue)', 'var(--color-green)', 'var(--color-blue-light)', 'var(--color-green-light)'];

/**
 * PDF §4 — each cornerstone lights up as its 3D object pops onto its orbit; when the orbits merge
 * around the logo, the statement "We operate at the intersection…" appears.
 */
export function Cornerstones() {
  const t = useContent();
  const list = useRef<HTMLOListElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const focused = useApp((s) => s.focus !== null);

  useEffect(
    () =>
      onJourney(() => {
        const p = journey.p[sectionIndex.cornerstones];
        const items = list.current?.children;
        if (!items) return;
        const meet = rangeProgress(p, KEYS.intersect);
        KEYS.rings.forEach((r, i) => {
          const el = items[i] as HTMLElement | undefined;
          if (!el) return;
          const lit = rangeProgress(p, r);
          const current = lit > 0 && (i === KEYS.rings.length - 1 || p < KEYS.rings[i + 1][0]);
          el.style.setProperty('--lit', String(Math.max(lit, meet)));
          el.toggleAttribute('data-current', current && meet < 0.2);
        });
        if (statement.current) {
          statement.current.style.opacity = String(meet);
          statement.current.style.transform = `translateY(${(1 - meet) * 16}px)`;
        }
      }),
    [],
  );

  return (
    <section
      id="cornerstones"
      data-stage="cornerstones" data-cursor="hold"
      data-focused={focused ? '' : undefined}
      data-tone="light"
      aria-labelledby="cornerstones-title"
      className="stage flex items-end px-[var(--gutter)] pb-[clamp(4rem,10vh,7rem)]"
    >
      <div className="w-full max-w-[34rem] transition-opacity duration-500" style={{ opacity: focused ? 0 : 1 }}>
        <SectionMark n={3} />
        <h2 id="cornerstones-title" className="display mt-5 text-[clamp(2rem,4.2vw,3.75rem)]">
          {t.cornerstones.title}
        </h2>
        <ol ref={list} className="mt-8 border-t border-mist/12">
          {t.cornerstones.items.map((item, i) => (
            <li
              key={item.key}
              className="group border-b border-mist/12 py-3.5 transition-opacity duration-500"
              style={{ opacity: 'calc(0.32 + var(--lit, 0) * 0.68)' } as CSSProperties}
            >
              <div className="flex items-baseline gap-3">
                <span aria-hidden="true" className="relative top-[-0.1em] size-2 shrink-0 rounded-full" style={{ background: RING_COLORS[i] }} />
                <h3 className="font-display text-[clamp(1.15rem,1.5vw,1.4rem)] font-semibold">{item.title}</h3>
                {item.term && (
                  <span lang="en" className="label text-mist/50">
                    {item.term}
                  </span>
                )}
              </div>
              <div className="expander group-data-[current]:[grid-template-rows:1fr]">
                <div>
                  <p className="pt-2 ps-5 text-[0.95rem] leading-relaxed text-mist/75">{item.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p ref={statement} className="mt-7 text-[clamp(1.05rem,1.35vw,1.3rem)] leading-snug text-mist/85" style={{ opacity: 0 }}>
          {t.cornerstones.statement.lead}
          <br />
          <strong className="bg-[image:var(--p-gradient-brand)] bg-[length:100%_3px] bg-bottom bg-no-repeat pb-1 font-display font-semibold text-mist">{t.cornerstones.statement.emphasis}</strong>
        </p>
      </div>
      <PlanetCard />
    </section>
  );
}

/**
 * Glass card for the cornerstone planet the camera has flown to (click a planet in 3D). Esc, the close
 * button, a click on empty space or any scroll closes it; previous/next fly between planets.
 */
function PlanetCard() {
  const t = useContent();
  const focus = useApp((s) => s.focus);
  const setFocus = useApp((s) => s.setFocus);
  const items = t.cornerstones.items;
  const last = useRef(0);
  if (focus !== null) last.current = focus;
  const i = last.current;
  const item = items[i];

  useEffect(() => {
    if (focus === null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocus(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, setFocus]);

  return (
    <aside
      aria-live="polite"
      data-no-hold
      data-open={focus !== null ? '' : undefined}
      className="planet-card pointer-events-none absolute end-[var(--gutter)] top-1/2 w-[min(25rem,calc(100vw-2*var(--gutter)))] -translate-y-1/2 opacity-0 data-[open]:pointer-events-auto data-[open]:opacity-100 portrait:top-auto portrait:bottom-[clamp(1.5rem,4vh,3rem)] portrait:translate-y-0"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="label flex items-center gap-2.5 text-mist/60">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: RING_COLORS[i] }} />
          <span dir="ltr">
            {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        </span>
        <button type="button" onClick={() => setFocus(null)} className="label rounded-full px-3 py-1.5 text-mist/70 hover:bg-white/50" aria-label={t.ui.close}>
          ✕
        </button>
      </div>
      <h3 className="font-display mt-4 text-[clamp(1.6rem,2.4vw,2.2rem)] leading-tight font-semibold">{item.title}</h3>
      {item.term && (
        <p lang="en" className="label mt-1 text-mist/50">
          {item.term}
        </p>
      )}
      <p className="mt-4 text-[0.98rem] leading-relaxed text-mist/80">{item.body}</p>
      <div className="mt-6 flex gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setFocus((i + items.length - 1) % items.length)} aria-label={t.ui.carousel.previous}>
          <span aria-hidden="true" className="rtl:-scale-x-100">←</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setFocus((i + 1) % items.length)} aria-label={t.ui.carousel.next}>
          <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
        </button>
      </div>
    </aside>
  );
}
