import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { site } from '@/config/site';
import { useApp } from '@/store/app';
import type { HailLink } from '@/gl/hail/HailScene';
import { REACH, type PlaceKey } from '@/gl/hail/terrain';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP);

// the 3D relief of Hail — its own lazy chunk, mounted near view
const HailScene = lazy(() => import('@/gl/hail/HailScene'));

/**
 * "Landing in Hail" — the payoff as the clouds clear. A 3D relief model of Hail (Aja, Salma, the Nafud)
 * seen top-down at first (it reads as a map), then standing up into 3D as you scroll; the glossy logo
 * drops onto Hail and arcs leave for the GCC & MENA. Drag to orbit, hover a place, hold to send the
 * voice out (src/gl/hail/HailScene.tsx). The coordinates scramble in, the name rises.
 * The block's top is transparent → it slides up over the white-out without an edge.
 */
export function Arrival() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const coords = useRef<HTMLParagraphElement>(null);
  const place = useRef<HTMLParagraphElement>(null);
  const link = useMemo<HailLink>(() => ({ p: 0, focus: null, labels: {}, surface: null }), []);
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
      ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom bottom', onUpdate: (self) => (link.p = self.progress) });
      if (reduced) {
        gsap.set([place.current, coords.current], { autoAlpha: 1 });
        return;
      }
      // played once on arrival: coordinates scramble, place name rises
      const arrive = gsap.timeline({ paused: true });
      arrive
        .fromTo(coords.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.1)
        .to(coords.current, { duration: 1.6, scrambleText: { text: site.hail.coords, chars: '0123456789°.', speed: 0.5 } }, 0.1)
        .fromTo(place.current, { autoAlpha: 0, y: 40, filter: 'blur(12px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out' }, 0.45);
      ScrollTrigger.create({ trigger: el, start: 'top 45%', once: true, onEnter: () => arrive.play() });
    },
    { scope: root, dependencies: [reduced, t.lang] },
  );

  const setLabel = (key: string) => (el: HTMLElement | null) => void (link.labels[key] = el);
  const places: PlaceKey[] = ['aja', 'salma', 'nafud'];

  return (
    <section ref={root} data-tone="light" data-cursor="hold" aria-label={`${site.hail.coords}, ${t.ui.arrival.place}`} className="relative" style={{ height: '230vh' }}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[42vh] bg-[linear-gradient(to_bottom,transparent,var(--color-paper))]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[42vh] bottom-0 bg-paper" />

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {mounted && (
          <Suspense fallback={null}>
            <HailScene link={link} active={active} />
          </Suspense>
        )}

        {/* labels anchored to the 3D model (positioned every frame by the scene) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {places.map((k) => (
            <span
              key={k}
              ref={setLabel(k)}
              data-no-hold
              onPointerEnter={() => (link.focus = k)}
              onPointerLeave={() => link.focus === k && (link.focus = null)}
              className="map-label pointer-events-auto"
              style={{ opacity: 0 }}
            >
              {t.ui.mapLabels[k]}
            </span>
          ))}
          {REACH.map((c) => (
            <span key={c.key} ref={setLabel(c.key)} className="map-label map-label--city" style={{ opacity: 0 }}>
              <span aria-hidden="true" className="map-dot" />
              {t.ui.arrival.cities[c.key]}
              <span lang="en" dir="ltr" className="opacity-55">
                {c.km.toLocaleString('en')} km
              </span>
            </span>
          ))}
        </div>

        {/* readable layer */}
        <div className="shell pointer-events-none relative flex h-full flex-col items-center justify-start pt-[15vh] text-center">
          <p ref={coords} lang="en" dir="ltr" className="rounded-full bg-paper/80 px-4 py-1.5 font-mono text-[clamp(0.95rem,1.8vw,1.5rem)] tracking-tight text-ink/80">
            {site.hail.coords}
          </p>
          <p ref={place} className="display mt-4 text-[clamp(3rem,9vw,8.5rem)] text-ink [text-shadow:0_0_40px_var(--color-paper),0_0_14px_var(--color-paper)]">
            {t.ui.arrival.place}
          </p>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center max-md:bottom-20">
          <div className="hold-hint">
            <span className="hold-ring" />
            <span className="label text-ink/75">{t.ui.holdHint}</span>
          </div>
        </div>

        {/* HUD */}
        <div aria-hidden="true" className="label pointer-events-none absolute start-[var(--gutter)] top-24 flex flex-col items-center gap-1 text-ink/60">
          <span className="text-base leading-none">↑</span>
          <span lang="en">N</span>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute start-[var(--gutter)] bottom-8 flex items-end gap-3 text-ink/60">
          <span className="flex h-2 w-40 border-x border-b border-current">
            <span className="w-1/2 border-e border-current" />
          </span>
          <span lang="en" dir="ltr" className="label">
            10 km
          </span>
        </div>
        <p aria-hidden="true" className="label pointer-events-none absolute end-[var(--gutter)] bottom-8 text-ink/60">
          {t.ui.altitude}{' '}
          <span lang="en" dir="ltr">
            0 m
          </span>
        </p>
      </div>
    </section>
  );
}
