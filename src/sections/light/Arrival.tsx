import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { site } from '@/config/site';
import { useApp } from '@/store/app';
import type { SpreadLink } from '@/gl/spread/WordOfMouth';
import { CITIES } from '@/gl/spread/crowd';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP);

// the word-of-mouth scene — its own lazy chunk, mounted near view
const WordOfMouth = lazy(() => import('@/gl/spread/WordOfMouth'));

const BUBBLES = 5;
type CityName = 'riyadh' | 'jeddah' | 'dubai' | 'kuwait' | 'doha' | 'cairo';
const LABELLED = CITIES.filter((c) => c.label).map((c) => c.key as CityName);

/**
 * "Landing in Hail" → WORD OF MOUTH SPREADS. As the clouds clear you're above Hail (coordinates, name);
 * scrolling, a conversation starts there and spreads person to person, city to city across the GCC —
 * thousands of people lighting up (src/gl/spread/). Notification bubbles pop from those just reached;
 * the funnel (Reach → Engagement → Conversion → Loyalty) fills as it spreads. Cursor parts the crowd,
 * drag orbits, hold broadcasts. The block's top is transparent → it slides over the white-out.
 */
export function Arrival() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const coords = useRef<HTMLParagraphElement>(null);
  const place = useRef<HTMLParagraphElement>(null);
  const link = useMemo<SpreadLink>(() => ({ p: 0, labels: {}, bubbles: [], messages: [], hud: null, surface: null, feed: null, cityNames: {} }), []);
  link.messages = [...t.ui.buzz.notifications, t.ui.buzz.hashtag];
  link.cityNames = { ...t.ui.arrival.cities };
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    link.surface = el;
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), { rootMargin: '120% 0px' });
    const seen = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    near.observe(el);
    seen.observe(el);
    return () => (near.disconnect(), seen.disconnect());
  }, [link]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom bottom',
        onUpdate: (self) => {
          link.p = self.progress;
          // the arrival title gives way as the camera pulls back
          if (title.current) title.current.style.opacity = String(1 - gsap.utils.clamp(0, 1, (self.progress - 0.16) / 0.1));
        },
      });
      if (reduced) {
        gsap.set([place.current, coords.current], { autoAlpha: 1 });
        return;
      }
      const arrive = gsap.timeline({ paused: true });
      arrive
        .fromTo(coords.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.1)
        .to(coords.current, { duration: 1.6, scrambleText: { text: site.hail.coords, chars: '0123456789°.', speed: 0.5 } }, 0.1)
        .fromTo(place.current, { autoAlpha: 0, y: 40, filter: 'blur(12px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out' }, 0.45);
      ScrollTrigger.create({ trigger: el, start: 'top 45%', once: true, onEnter: () => arrive.play() });
    },
    { scope: root, dependencies: [reduced, t.lang] },
  );

  return (
    <section ref={root} data-tone="light" data-cursor="hold" aria-label={`${site.hail.coords}, ${t.ui.arrival.place}`} className="relative" style={{ height: '320vh' }}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[42vh] bg-[linear-gradient(to_bottom,transparent,var(--color-paper))]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[42vh] bottom-0 bg-paper" />

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {mounted && (
          <Suspense fallback={null}>
            <WordOfMouth link={link} active={active} />
          </Suspense>
        )}

        {/* city tags + notification bubbles, anchored to the 3D crowd by the scene */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {LABELLED.map((key) => (
            <span key={key} ref={(el) => void (link.labels[key] = el)} className="map-label map-label--city" style={{ opacity: 0 }}>
              <span className="map-dot" />
              {t.ui.arrival.cities[key]}
            </span>
          ))}
          {Array.from({ length: BUBBLES }, (_, k) => (
            <span key={k} ref={(el) => void (link.bubbles[k] = el)} className="wom-bubble" style={{ opacity: 0 }} />
          ))}
        </div>

        {/* arrival title */}
        <div ref={title} className="shell pointer-events-none relative flex h-full flex-col items-center justify-start pt-[15vh] text-center">
          <p ref={coords} lang="en" dir="ltr" className="rounded-full bg-paper/85 px-4 py-1.5 font-mono text-[clamp(0.95rem,1.8vw,1.5rem)] tracking-tight text-ink/80">
            {site.hail.coords}
          </p>
          <p ref={place} className="display mt-4 text-[clamp(3rem,9vw,8.5rem)] text-ink [text-shadow:0_0_40px_var(--color-paper),0_0_14px_var(--color-paper)]">
            {t.ui.arrival.place}
          </p>
        </div>

        {/* live feed: notifications arriving from the cities the word has reached */}
        <div aria-hidden="true" className="wom-feed pointer-events-none absolute start-[var(--gutter)] top-1/2 -translate-y-1/2 max-lg:hidden">
          <p className="label flex items-center gap-2 text-ink/60">
            <span className="wom-live" />
            {t.ui.buzz.live} · <span lang="en">{t.ui.buzz.handle}</span>
          </p>
          <ol ref={(el) => void (link.feed = el)} />
        </div>

        {/* the funnel fills as the word spreads */}
        <div ref={(el) => void (link.hud = el)} aria-hidden="true" className="wom-funnel pointer-events-none absolute inset-x-0 top-24 flex justify-center max-md:top-20">
          <ol>
            {t.ui.buzz.funnel.map((step, i) => (
              <li key={step} data-i={i}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center max-md:bottom-8">
          <div className="hold-hint">
            <span className="hold-ring" />
            <span className="label text-ink/75">{t.ui.holdHint}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
