import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { site } from '@/config/site';
import { useApp } from '@/store/app';
import { AJA, BASIN, DUNES, GRID, HAIL, SALMA, VIEW } from './topo';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP);

/**
 * "Landing in Hail" — the payoff as the clouds clear. A topographic map of Hail (Aja, Salma, the
 * Nafud) draws itself in the brand gradient, the speech-bubble pin drops onto Hail with a radar
 * sweep, the coordinates scramble into place. Layers follow the pointer in depth.
 * The block's top is transparent → it slides up over the white-out without an edge.
 */
export function Arrival() {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const map = useRef<SVGSVGElement>(null);
  const coords = useRef<HTMLParagraphElement>(null);
  const place = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const paths = gsap.utils.toArray<SVGPathElement>('[data-draw]', el);
      const fades = gsap.utils.toArray<SVGElement>('[data-map-fade]', el);
      if (reduced) {
        gsap.set(paths, { strokeDashoffset: 0 });
        gsap.set([...fades, '[data-pin]', place.current, coords.current], { autoAlpha: 1 });
        return;
      }

      // scrubbed: the map draws itself and the camera "lands" (slow zoom out) as the block rises
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: 0.8 } });
      tl.fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 0.28, stagger: { each: 0.0025, from: 'random' } }, 0)
        .fromTo(fades, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0.25)
        .fromTo(map.current, { scale: 1.18 }, { scale: 1, ease: 'none', duration: 1, transformOrigin: `${(HAIL.x / VIEW.w) * 100}% ${(HAIL.y / VIEW.h) * 100}%` }, 0);

      // played once on arrival: pin drop, coordinates scramble, place name
      const arrive = gsap.timeline({ paused: true });
      arrive
        .fromTo('[data-pin]', { autoAlpha: 0, y: -260 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'bounce.out' })
        .fromTo(coords.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.1)
        .to(coords.current, { duration: 1.6, scrambleText: { text: site.hail.coords, chars: '0123456789°.', speed: 0.5 } }, 0.1)
        .fromTo(place.current, { autoAlpha: 0, y: 40, filter: 'blur(12px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out' }, 0.45);
      ScrollTrigger.create({ trigger: el, start: 'top 45%', once: true, onEnter: () => arrive.play() });
    },
    { scope: root, dependencies: [reduced, t.lang] },
  );

  // depth parallax: each layer follows the pointer by a different amount
  useEffect(() => {
    const el = root.current;
    if (!el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const layers = gsap.utils.toArray<SVGGElement>('[data-depth]', el).map((g) => ({
      x: gsap.quickTo(g, 'x', { duration: 1.2, ease: 'power3.out' }),
      y: gsap.quickTo(g, 'y', { duration: 1.2, ease: 'power3.out' }),
      depth: Number(g.dataset.depth),
    }));
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach((l) => {
        l.x(-nx * l.depth);
        l.y(-ny * l.depth);
      });
    };
    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, [reduced]);

  const ring = (d: string, level: number, key: string) => (
    <path key={key} d={d} pathLength={1} data-draw strokeDasharray="1" strokeWidth={level > 0.85 ? 1.6 : 1} opacity={0.3 + level * 0.6} />
  );

  return (
    <section ref={root} data-tone="light" aria-label={`${site.hail.coords}, ${t.ui.arrival.place}`} className="relative" style={{ height: '230vh' }}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[42vh] bg-[linear-gradient(to_bottom,transparent,var(--color-paper))]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[42vh] bottom-0 bg-paper" />

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <svg ref={map} aria-hidden="true" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="arrival-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--color-blue)' }} />
              <stop offset="1" style={{ stopColor: 'var(--color-green)' }} />
            </linearGradient>
            <linearGradient id="arrival-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: 'var(--color-blue)', stopOpacity: 0 }} />
              <stop offset="1" style={{ stopColor: 'var(--color-blue)', stopOpacity: 0.28 }} />
            </linearGradient>
            <linearGradient id="arrival-bubble-b" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--color-blue-light)' }} />
              <stop offset="1" style={{ stopColor: 'var(--color-blue-deep)' }} />
            </linearGradient>
            <linearGradient id="arrival-bubble-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--color-green-light)' }} />
              <stop offset="1" style={{ stopColor: 'var(--color-green-deep)' }} />
            </linearGradient>
          </defs>

          <g data-depth="6" stroke="var(--color-ink)" strokeOpacity="0.06" fill="none">
            {GRID.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g data-depth="14" stroke="url(#arrival-stroke)" fill="none" opacity="0.7">
            {DUNES.map((d, i) => (
              <path key={i} d={d} pathLength={1} data-draw strokeDasharray="1" strokeWidth="1" />
            ))}
          </g>
          <g data-depth="26" stroke="url(#arrival-stroke)" fill="none">
            {AJA.map((c, i) => ring(c.d, c.level, `a${i}`))}
          </g>
          <g data-depth="20" stroke="url(#arrival-stroke)" fill="none">
            {SALMA.map((c, i) => ring(c.d, c.level, `s${i}`))}
          </g>
          <g data-depth="10">
            <g stroke="url(#arrival-stroke)" fill="none" strokeDasharray="4 6" opacity="0.6">
              {BASIN.map((c, i) => (
                <path key={i} d={c.d} />
              ))}
            </g>
            {/* radar sweep around Hail */}
            {!reduced && (
              <g className="arrival-radar" style={{ transformOrigin: `${HAIL.x}px ${HAIL.y}px` }}>
                <path
                  d={`M${HAIL.x},${HAIL.y} L${HAIL.x + 260},${HAIL.y} A260,260 0 0 0 ${(HAIL.x + 260 * Math.cos(-0.7)).toFixed(1)},${(HAIL.y + 260 * Math.sin(-0.7)).toFixed(1)} Z`}
                  fill="url(#arrival-sweep)"
                />
              </g>
            )}
            <circle cx={HAIL.x} cy={HAIL.y} r="260" fill="none" stroke="var(--color-blue)" strokeOpacity="0.25" />
            {!reduced &&
              [0, 1, 2].map((i) => (
                <circle
                  key={i}
                  className="arrival-ripple"
                  cx={HAIL.x}
                  cy={HAIL.y}
                  r="70"
                  fill="none"
                  stroke="var(--color-green)"
                  strokeWidth="1.5"
                  style={{ transformOrigin: `${HAIL.x}px ${HAIL.y}px`, animationDelay: `${i * 0.9}s` }}
                />
              ))}
            {/* the pin: the logo's two speech bubbles, dropped onto Hail */}
            <g transform={`translate(${HAIL.x - 27} ${HAIL.y - 70}) scale(1.5)`}>
              <g data-pin>
                <ellipse cx="18" cy="47" rx="12" ry="3" fill="var(--color-ink)" opacity="0.15" />
                <path d="M19 9h12a7 7 0 0 1 7 7v7a7 7 0 0 1-7 7h-1l1 5-6-5h-6a7 7 0 0 1-7-7v-7a7 7 0 0 1 7-7z" fill="url(#arrival-bubble-g)" />
                <path d="M8 1h14a7 7 0 0 1 7 7v8a7 7 0 0 1-7 7H11l-7 6 1.5-6.3A7 7 0 0 1 1 16V8a7 7 0 0 1 7-7z" fill="url(#arrival-bubble-b)" />
                <rect x="12.6" y="5" width="4.8" height="9" rx="2.4" fill="#fff" />
                <path d="M10.6 11.5a4.4 4.4 0 0 0 8.8 0M15 16v2.4" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* place names on the map */}
          <g data-map-fade fill="var(--color-ink)" fillOpacity="0.55" fontSize="16" style={{ fontFamily: 'var(--font-mono)', letterSpacing: t.lang === 'ar' ? 0 : 3 }}>
            <text x="430" y="476" textAnchor="middle">
              {t.ui.mapLabels.aja}
            </text>
            <text x="1220" y="770" textAnchor="middle">
              {t.ui.mapLabels.salma}
            </text>
            <text x="800" y="150" textAnchor="middle">
              {t.ui.mapLabels.nafud}
            </text>
          </g>
        </svg>

        {/* readable layer */}
        <div className="shell pointer-events-none relative flex h-full flex-col items-center justify-start pt-[15vh] text-center">
          <p ref={coords} lang="en" dir="ltr" className="rounded-full bg-paper/80 px-4 py-1.5 font-mono text-[clamp(0.95rem,1.8vw,1.5rem)] tracking-tight text-ink/80 backdrop-blur-sm">
            {site.hail.coords}
          </p>
          <p ref={place} className="display mt-4 text-[clamp(3rem,9vw,8.5rem)] text-ink [text-shadow:0_0_40px_var(--color-paper),0_0_14px_var(--color-paper)]">
            {t.ui.arrival.place}
          </p>
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
          <span lang="en" className="label">
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
